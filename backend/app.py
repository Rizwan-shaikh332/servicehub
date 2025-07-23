from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
import os
from dotenv import load_dotenv
import requests
from datetime import datetime, timedelta

load_dotenv()

app = Flask(__name__)
# Replace your current CORS(app) with:
CORS(app, resources={
    r"/api/*": {
        "origins": ["*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI')

try:
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=5000,  # 5 seconds timeout for server selection
        socketTimeoutMS=30000,          # 30 seconds timeout for socket operations
        connectTimeoutMS=10000,         # 10 seconds timeout for connection
        server_api=ServerApi('1')       # Stable API version
    )
    
    # Test the connection
    client.admin.command('ping')
    print("Successfully connected to MongoDB!")
    
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")
    raise
db = client.servicehub

# Collections
users_collection = db.users
admins_collection = db.admins
services_collection = db.services
service_requests_collection = db.service_requests
user_service_prices_collection = db.user_service_prices
payment_history_collection = db.payment_history
llr_tokens_collection = db.llr_tokens
dl_pdfs_collection = db.dl_pdfs

# API Configurations
LLR_API_KEY = os.getenv('LLR_API_KEY')
LLR_EXAM_API_URL = "https://api.jkdigitalcenter.in/api/v2/llexam/doexam.php"
LLR_STATUS_API_URL = "https://api.jkdigitalcenter.in/api/v2/llexam/checkexam.php"
LLR_CALLBACK_URL = os.getenv('LLR_CALLBACK_URL', 'http://localhost:5000/api/llr/callback')

DL_PDF_API_URL = "https://api.jkdigitalcenter.in/api/v2/dlpdfapi.php"
DL_API_KEY = os.getenv('LLR_API_KEY')  # Using same API key as LLR

# Initialize collections
def initialize_collections():
    dl_pdfs_collection.create_index([("userId", 1)])
    dl_pdfs_collection.create_index([("dlno", 1)])
    dl_pdfs_collection.create_index([("createdAt", -1)])
    
    # Create default admin if not exists
    if not admins_collection.find_one({"username": "admin"}):
        admins_collection.insert_one({
            "username": "admin",
            "password": "admin123",
            "createdAt": datetime.utcnow()
        })
        print("Default admin created - Username: admin, Password: admin123")

initialize_collections()

# Helper functions
def add_payment_history(user_id, transaction_type, amount, description, reference_id=None):
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if user:
            history_doc = {
                "userId": ObjectId(user_id),
                "userName": user['name'],
                "userMobile": user['mobile'],
                "transactionType": transaction_type,
                "amount": amount,
                "description": description,
                "referenceId": reference_id,
                "balanceAfter": user.get('walletBalance', 0),
                "createdAt": datetime.utcnow()
            }
            payment_history_collection.insert_one(history_doc)
    except Exception as e:
        print(f"Error adding payment history: {e}")

# DL PDF Services
@app.route('/api/dl/generate-pdf', methods=['POST'])
def generate_dl_pdf():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['userId', 'serviceId', 'dlno']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}",
                "required_fields": required_fields
            }), 400

        # Extract and clean data
        user_id = data['userId']
        service_id = data['serviceId']
        dlno = data['dlno'].strip().upper()
        pdf_type = data.get('type', 'type1').strip().lower()
        blood = data.get('blood', 'O+').strip().upper()
        addrtype = data.get('addrtype', 'perm').strip().lower()

        # Validate ObjectIDs
        try:
            user_oid = ObjectId(user_id)
            service_oid = ObjectId(service_id)
        except:
            return jsonify({"error": "Invalid ID format"}), 400

        # Get user and service
        user = users_collection.find_one({"_id": user_oid})
        service = services_collection.find_one({"_id": service_oid})

        if not user:
            return jsonify({"error": "User not found"}), 404
        if user.get('isBlocked'):
            return jsonify({"error": "Account blocked"}), 403
        if not service:
            return jsonify({"error": "Service not found"}), 404
        if not service.get('isActive', True):
            return jsonify({"error": "Service unavailable"}), 400

        # Get service price
        user_price = user_service_prices_collection.find_one({
            "userId": user_oid,
            "serviceId": service_oid
        })
        service_price = user_price['price'] if user_price else service.get('defaultPrice', 0)
        
        if service_price <= 0:
            return jsonify({"error": "Service price not configured"}), 400
        if user.get('walletBalance', 0) < service_price:
            return jsonify({"error": "Insufficient wallet balance"}), 400

        # Call DL PDF API
        api_data = {
            "apikey": DL_API_KEY,
            "dlno": dlno,
            "type": pdf_type,
            "blood": blood,
            "addrtype": addrtype
        }

        try:
            response = requests.post(
                DL_PDF_API_URL,
                data=api_data,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'ServiceHub-DL/1.0'
                },
                timeout=60
            )
            response.raise_for_status()
            
            api_response = response.json()
            if api_response.get('status') != '200':
                return jsonify({
                    "error": api_response.get('message', 'API request failed'),
                    "api_status": api_response.get('status')
                }), 400

            # Process successful response
            new_balance = user['walletBalance'] - service_price
            users_collection.update_one(
                {"_id": user_oid},
                {"$set": {"walletBalance": new_balance}}
            )

            # Store PDF record
            pdf_record = {
                "userId": user_oid,
                "userName": user['name'],
                "userMobile": user['mobile'],
                "serviceId": service_oid,
                "serviceName": service['name'],
                "servicePrice": service_price,
                "dlno": dlno,
                "pdfType": pdf_type,
                "bloodGroup": blood,
                "addressType": addrtype,
                "status": "completed",
                "name": api_response.get('name'),
                "dob": api_response.get('dob'),
                "pdfData": api_response.get('pdf'),
                "apiResponse": api_response,
                "createdAt": datetime.utcnow()
            }
            
            result = dl_pdfs_collection.insert_one(pdf_record)
            
            # Record transaction
            add_payment_history(
                user_id=user_id,
                transaction_type="debit",
                amount=service_price,
                description=f"DL PDF Generation - {dlno}",
                reference_id=str(result.inserted_id)
            )
            
            return jsonify({
                "success": True,
                "message": "DL PDF generated successfully",
                "name": api_response.get('name'),
                "dob": api_response.get('dob'),
                "pdfData": api_response.get('pdf'),
                "newWalletBalance": new_balance
            })

        except requests.exceptions.RequestException as e:
            return jsonify({
                "error": "DL API service unavailable",
                "details": str(e)
            }), 503
        except ValueError as e:
            return jsonify({
                "error": "Invalid API response",
                "details": str(e)
            }), 502

    except Exception as e:
        app.logger.error(f"DL PDF Generation Error: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route('/api/dl/user-pdfs/<user_id>', methods=['GET'])
def get_user_dl_pdfs(user_id):
    try:
        pdfs = list(dl_pdfs_collection.find(
            {"userId": ObjectId(user_id)},
            {"pdfData": 0}  # Exclude PDF data from list view
        ).sort("createdAt", -1))
        
        for pdf in pdfs:
            pdf['_id'] = str(pdf['_id'])
            pdf['userId'] = str(pdf['userId'])
            pdf['serviceId'] = str(pdf['serviceId'])
        
        return jsonify({"pdfs": pdfs})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/dl/download-pdf/<pdf_id>', methods=['GET'])
def download_dl_pdf(pdf_id):
    try:
        pdf = dl_pdfs_collection.find_one(
            {"_id": ObjectId(pdf_id)},
            {"_id": 0, "pdfData": 1, "name": 1, "dob": 1, "dlno": 1}
        )
        
        if not pdf or not pdf.get('pdfData'):
            return jsonify({"error": "PDF not found"}), 404
            
        return jsonify({
            "success": True,
            "name": pdf.get('name'),
            "dob": pdf.get('dob'),
            "dlno": pdf.get('dlno'),
            "pdfData": pdf['pdfData']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

# Create default admin if not exists
def create_default_admin():
    try:
        admin_exists = admins_collection.find_one({"username": "admin"})
        if not admin_exists:
            admin_doc = {
                "username": "admin",
                "password": "admin123",
                "createdAt": datetime.utcnow()
            }
            admins_collection.insert_one(admin_doc)
            print("Default admin created - Username: admin, Password: admin123")
    except Exception as e:
        print(f"Error creating default admin: {e}")

# Initialize default admin
create_default_admin()


# Payment Gateway Endpoints
@app.route('/api/payment/create-order', methods=['POST', 'OPTIONS'])
def create_payment_order():
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'status': 'preflight'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response

    try:
        # Validate request
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        data = request.get_json()
        
        # Validate required fields
        required_fields = ['userId', 'amount']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}",
                "required_fields": required_fields
            }), 400

        # Validate amount
        try:
            amount = float(data['amount'])
            if amount < 200:
                return jsonify({
                    "error": "Minimum amount is ₹200",
                    "minimum_amount": 200
                }), 400
        except ValueError:
            return jsonify({
                "error": "Invalid amount value",
                "details": "Amount must be a valid number"
            }), 400

        # Validate user exists and is not blocked
        try:
            user_id = ObjectId(data['userId'])
        except:
            return jsonify({"error": "Invalid user ID format"}), 400

        user = users_collection.find_one({"_id": user_id})
        if not user:
            return jsonify({"error": "User not found"}), 404
        if user.get('isBlocked', False):
            return jsonify({"error": "Account blocked"}), 403

        # Generate transaction details
        transaction_id = f"TXN{str(uuid.uuid4().hex)[:16].upper()}"
        upi_id = "payment@jkdigitalcenter.in"
        qr_code_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa={upi_id}&pn=JK%20Digital%20Center&am={amount}&cu=INR"
        payment_link = f"https://api.jkdigitalcenter.in/payment?token={transaction_id}"
        
        # Create payment record
        payment_record = {
            "userId": user_id,
            "userName": user.get('name'),
            "userMobile": user.get('mobile'),
            "amount": amount,
            "transactionId": transaction_id,
            "status": "pending",
            "qrCodeUrl": qr_code_url,
            "upiId": upi_id,
            "paymentLink": payment_link,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        # Insert into database with error handling
        try:
            result = db.payments.insert_one(payment_record)
            if not result.inserted_id:
                raise Exception("Failed to create payment record")
        except Exception as e:
            app.logger.error(f"Database insertion failed: {str(e)}")
            return jsonify({
                "error": "Payment processing failed",
                "details": "Could not save payment record"
            }), 500

        # Add to payment history
        try:
            add_payment_history(
                user_id=str(user_id),
                transaction_type="pending_credit",
                amount=amount,
                description=f"Payment initiated - {transaction_id}",
                reference_id=transaction_id
            )
        except Exception as e:
            app.logger.error(f"Payment history recording failed: {str(e)}")
            # Continue even if history fails - main payment succeeded

        # Prepare success response
        response_data = {
            "status": "success",
            "message": "Payment order created successfully",
            "data": {
                "transactionId": transaction_id,
                "amount": amount,
                "qrCodeUrl": qr_code_url,
                "upiId": upi_id,
                "paymentLink": payment_link,
                "user": {
                    "id": str(user_id),
                    "name": user.get('name'),
                    "mobile": user.get('mobile'),
                    "walletBalance": user.get('walletBalance', 0)
                }
            }
        }

        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except ValueError as e:
        return jsonify({
            "error": "Invalid input data",
            "details": str(e)
        }), 400
    except Exception as e:
        app.logger.error(f"Unexpected error in payment creation: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "details": "Please try again later"
        }), 500

@app.route('/api/payment/gateway-history', methods=['GET'])
def get_payment_gateway_history():
    try:
        user_id = request.args.get('userId')
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
        
        payments = list(db.payments.find(
            {"userId": ObjectId(user_id)},
            sort=[("createdAt", -1)],
            limit=10
        ))
        
        # Convert ObjectId and datetime to strings
        for payment in payments:
            payment['_id'] = str(payment['_id'])
            payment['userId'] = str(payment['userId'])
            payment['createdAt'] = payment['createdAt'].isoformat()
            if 'updatedAt' in payment:
                payment['updatedAt'] = payment['updatedAt'].isoformat()
        
        return jsonify({"history": payments})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/payment/callback', methods=['POST'])
def payment_callback():
    try:
        txnid = request.args.get('token')
        if not txnid:
            return jsonify({"error": "Token is required"}), 400
        
        # Verify the transaction with payment gateway
        api_url = f"https://api.jkdigitalcenter.in/api/v2/pg/orders/pg-order-status.php?txnid={txnid}"
        response = requests.get(api_url)
        response_data = response.json()
        
        if response_data.get('status') == '200':
            # Payment successful - update our database
            payment = db.payments.find_one({"txn_id": txnid})
            if payment and payment['status'] != 'success':
                # Update payment status
                db.payments.update_one(
                    {"txn_id": txnid},
                    {"$set": {
                        "status": "success",
                        "updatedAt": datetime.utcnow()
                    }}
                )
                
                # Update user wallet balance
                users_collection.update_one(
                    {"_id": payment['userId']},
                    {"$inc": {"walletBalance": payment['amount']}}
                )
                
                # Add payment history
                add_payment_history(
                    str(payment['userId']),
                    "credit",
                    payment['amount'],
                    "Wallet top-up via payment gateway",
                    txnid
                )
        
        return jsonify({"status": "ok"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Service Hub API is running"})

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400
        
        admin = admins_collection.find_one({
            "username": username,
            "password": password
        })
        
        if not admin:
            return jsonify({"error": "Invalid admin credentials"}), 401
        
        return jsonify({
            "success": True,
            "admin": {
                "id": str(admin['_id']),
                "username": admin['username']
            }
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    try:
        # Get today's date range
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        # Get today's requests
        today_requests = list(service_requests_collection.find({
            "createdAt": {
                "$gte": today_start,
                "$lt": today_end
            }
        }))
        
        # Get today's LLR requests
        today_llr_requests = list(llr_tokens_collection.find({
            "createdAt": {
                "$gte": today_start,
                "$lt": today_end
            }
        }))
        
        # Calculate today's total amount
        today_amount = sum(req['servicePrice'] for req in today_requests if req.get('status') == 'success')
        today_amount += sum(req['servicePrice'] for req in today_llr_requests)
        
        # Get all time stats
        all_requests = list(service_requests_collection.find({}))
        all_llr_requests = list(llr_tokens_collection.find({}))
        total_users = users_collection.count_documents({})
        total_services = services_collection.count_documents({})
        
        total_requests_count = len(all_requests) + len(all_llr_requests)
        today_requests_count = len(today_requests) + len(today_llr_requests)
        
        return jsonify({
            "todayRequests": today_requests_count,
            "todayAmount": today_amount,
            "totalRequests": total_requests_count,
            "totalUsers": total_users,
            "totalServices": total_services,
            "pendingRequests": len([req for req in all_requests if req.get('status') == 'pending']),
            "successRequests": len([req for req in all_requests if req.get('status') == 'success']) + len([req for req in all_llr_requests if req.get('status') == 'completed'])
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/create-user', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        name = data.get('name')
        mobile = data.get('mobile')
        password = data.get('password')
        
        if not name or not mobile or not password:
            return jsonify({"error": "Name, mobile number, and password are required"}), 400
        
        # Validate mobile number (should be 10 digits)
        if not mobile.isdigit() or len(mobile) != 10:
            return jsonify({"error": "Mobile number must be exactly 10 digits"}), 400
        
        # Check if mobile number already exists
        existing_user = users_collection.find_one({"mobile": mobile})
        if existing_user:
            return jsonify({"error": "User with this mobile number already exists"}), 400
        
        # Create user document
        user_doc = {
            "name": name,
            "mobile": mobile,
            "password": password,
            "walletBalance": 0.0,
            "isBlocked": False,
            "createdAt": datetime.utcnow()
        }
        
        result = users_collection.insert_one(user_doc)
        user_id = result.inserted_id
        
        # Set default prices for all existing services
        services = list(services_collection.find({}))
        for service in services:
            if service.get('defaultPrice', 0) > 0:
                user_service_prices_collection.insert_one({
                    "userId": user_id,
                    "serviceId": service['_id'],
                    "price": service['defaultPrice'],
                    "createdAt": datetime.utcnow()
                })
        
        return jsonify({
            "success": True,
            "user": {
                "id": str(user_id),
                "name": name,
                "mobile": mobile,
                "password": password,
                "walletBalance": 0.0,
                "isBlocked": False
            }
        })
    
    except Exception as e:
        print(f"Error creating user: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/toggle-user-status', methods=['PUT'])
def toggle_user_status():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        is_blocked = data.get('isBlocked')
        
        if not user_id or is_blocked is None:
            return jsonify({"error": "User ID and block status are required"}), 400
        
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"isBlocked": is_blocked}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "User not found"}), 404
        
        status = "blocked" if is_blocked else "unblocked"
        return jsonify({"success": True, "message": f"User {status} successfully"})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/set-service-price', methods=['PUT'])
def set_service_price():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        service_id = data.get('serviceId')
        price = data.get('price')
        
        if not user_id or not service_id or price is None:
            return jsonify({"error": "User ID, Service ID, and price are required"}), 400
        
        # Validate price
        try:
            price = float(price)
        except ValueError:
            return jsonify({"error": "Price must be a valid number"}), 400
        
        # Update or create user-specific service price
        user_service_prices_collection.update_one(
            {"userId": ObjectId(user_id), "serviceId": ObjectId(service_id)},
            {"$set": {
                "userId": ObjectId(user_id),
                "serviceId": ObjectId(service_id),
                "price": price,
                "updatedAt": datetime.utcnow()
            }},
            upsert=True
        )
        
        return jsonify({"success": True, "message": "Service price updated successfully"})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/update-wallet', methods=['PUT'])
def update_wallet():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        wallet_balance = data.get('walletBalance')
        
        if not user_id or wallet_balance is None:
            return jsonify({"error": "User ID and wallet balance are required"}), 400
        
        # Validate wallet balance is a number
        try:
            wallet_balance = float(wallet_balance)
        except ValueError:
            return jsonify({"error": "Wallet balance must be a valid number"}), 400
        
        # Get current balance to calculate difference
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        current_balance = user.get('walletBalance', 0)
        difference = wallet_balance - current_balance
        
        # Update wallet balance
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"walletBalance": wallet_balance}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "User not found"}), 404
        
        # Add payment history entry
        if difference != 0:
            transaction_type = "credit" if difference > 0 else "debit"
            description = f"Wallet {transaction_type} by admin: ₹{abs(difference)}"
            add_payment_history(user_id, transaction_type, abs(difference), description)
        
        return jsonify({"success": True, "message": "Wallet balance updated successfully"})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    try:
        users = list(users_collection.find({}, {"password": 0}))
        for user in users:
            user['_id'] = str(user['_id'])
        
        return jsonify({"users": users})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Service Management APIs
@app.route('/api/admin/services', methods=['POST'])
def create_service():
    try:
        data = request.get_json()
        name = data.get('name')
        description = data.get('description')
        default_price = data.get('defaultPrice', 0)
        fields = data.get('fields', [])
        
        if not name or not description:
            return jsonify({"error": "Name and description are required"}), 400
        
        # Validate default price
        try:
            default_price = float(default_price)
        except ValueError:
            return jsonify({"error": "Default price must be a valid number"}), 400
        
        # Validate fields
        if not isinstance(fields, list):
            return jsonify({"error": "Fields must be an array"}), 400
        
        service_doc = {
            "name": name,
            "description": description,
            "defaultPrice": default_price,
            "fields": fields,
            "isActive": True,
            "createdAt": datetime.utcnow()
        }
        
        result = services_collection.insert_one(service_doc)
        service_id = result.inserted_id
        
        # Set default price for all existing users
        if default_price > 0:
            users = list(users_collection.find({}))
            for user in users:
                user_service_prices_collection.insert_one({
                    "userId": user['_id'],
                    "serviceId": service_id,
                    "price": default_price,
                    "createdAt": datetime.utcnow()
                })
        
        return jsonify({
            "success": True,
            "service": {
                "id": str(service_id),
                "name": name,
                "description": description,
                "defaultPrice": default_price,
                "fields": fields,
                "isActive": True
            }
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/services', methods=['GET'])
def get_all_services():
    try:
        services = list(services_collection.find({}))
        for service in services:
            service['_id'] = str(service['_id'])
        
        return jsonify({"services": services})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/services/<service_id>/toggle', methods=['PUT'])
def toggle_service_status(service_id):
    try:
        data = request.get_json()
        is_active = data.get('isActive')
        
        if is_active is None:
            return jsonify({"error": "Service status is required"}), 400
        
        result = services_collection.update_one(
            {"_id": ObjectId(service_id)},
            {"$set": {"isActive": is_active}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Service not found"}), 404
        
        status = "activated" if is_active else "deactivated"
        return jsonify({"success": True, "message": f"Service {status} successfully"})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/services/<service_id>', methods=['DELETE'])
def delete_service(service_id):
    try:
        result = services_collection.delete_one({"_id": ObjectId(service_id)})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Service not found"}), 404
        
        # Also delete user-specific prices for this service
        user_service_prices_collection.delete_many({"serviceId": ObjectId(service_id)})
        
        return jsonify({"success": True, "message": "Service deleted successfully"})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# LLR Service APIs
@app.route('/api/llr/submit-exam', methods=['POST'])
def submit_llr_exam():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        service_id = data.get('serviceId')
        applno = data.get('applno')
        dob = data.get('dob')
        password = data.get('pass')
        pin = data.get('pin', '')
        exam_type = data.get('type', 'day')
        
        if not all([user_id, service_id, applno, dob, password]):
            missing_fields = []
            if not user_id: missing_fields.append('userId')
            if not service_id: missing_fields.append('serviceId')
            if not applno: missing_fields.append('applno')
            if not dob: missing_fields.append('dob')
            if not password: missing_fields.append('pass')
            
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
        
        # Get user and service details
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        service = services_collection.find_one({"_id": ObjectId(service_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if user.get('isBlocked', False):
            return jsonify({"error": "Your account has been blocked. Please contact administrator."}), 403
        
        if not service:
            return jsonify({"error": "Service not found"}), 404
        
        # Get user-specific price
        user_price = user_service_prices_collection.find_one({
            "userId": ObjectId(user_id),
            "serviceId": ObjectId(service_id)
        })
        
        service_price = user_price['price'] if user_price else service.get('defaultPrice', 0)
        
        if service_price <= 0:
            return jsonify({"error": "Service price not set for your account. Please contact administrator."}), 400
        
        # Check wallet balance
        if user.get('walletBalance', 0) < service_price:
            return jsonify({"error": "Insufficient wallet balance"}), 400
        
        # Clean and format data for LLR API
        clean_applno = applno.strip().upper()
        clean_dob = dob.strip()
        clean_password = password.strip().upper()
        clean_pin = pin.strip() if pin else ""
        clean_type = exam_type.strip().lower()
        
        # Call LLR API
        llr_data = {
            "apikey": LLR_API_KEY,
            "applno": clean_applno,
            "dob": clean_dob,
            "pass": clean_password,
            "pin": clean_pin,
            "type": clean_type,
            "callback": LLR_CALLBACK_URL
        }
        
        try:
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'ServiceHub-LLR/1.0'
            }
            
            response = requests.post(
                LLR_EXAM_API_URL, 
                data=llr_data, 
                headers=headers,
                timeout=90
            )
            
            llr_response = response.json()
            
            if llr_response.get('status') == '200':
                # Deduct amount from wallet
                new_balance = user.get('walletBalance', 0) - service_price
                users_collection.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": {"walletBalance": new_balance}}
                )
                
                # Store LLR token and response
                token_doc = {
                    "userId": ObjectId(user_id),
                    "userName": user['name'],
                    "userMobile": user['mobile'],
                    "serviceId": ObjectId(service_id),
                    "serviceName": service['name'],
                    "servicePrice": service_price,
                    "token": llr_response.get('token'),
                    "applno": llr_response.get('applno', clean_applno),
                    "applname": llr_response.get('applname', ''),
                    "dob": llr_response.get('dob', clean_dob),
                    "queue": llr_response.get('queue', ''),
                    "rtocode": llr_response.get('rtocode', ''),
                    "rtoname": llr_response.get('rtoname', ''),
                    "statecode": llr_response.get('statecode', ''),
                    "statename": llr_response.get('statename', ''),
                    "status": "submitted",
                    "apiResponse": llr_response,
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow()
                }
                
                result = llr_tokens_collection.insert_one(token_doc)
                
                # Add payment history entry
                description = f"Payment for {service['name']} service - Application: {clean_applno}"
                add_payment_history(user_id, "debit", service_price, description, str(result.inserted_id))
                
                return jsonify({
                    "success": True,
                    "message": "LLR exam request submitted successfully!",
                    "token": llr_response.get('token'),
                    "queue": llr_response.get('queue', ''),
                    "applname": llr_response.get('applname', ''),
                    "rtoname": llr_response.get('rtoname', ''),
                    "newWalletBalance": new_balance
                })
                
            elif llr_response.get('status') == '404':
                return jsonify({
                    "error": "Application data verification failed",
                    "message": llr_response.get('message'),
                    "details": "Please verify that your Application Number and Date of Birth exactly match your LLR application documents."
                }), 400
                
            elif llr_response.get('status') == '500':
                return jsonify({
                    "error": "LLR service temporarily unavailable",
                    "message": llr_response.get('message')
                }), 500
                
            else:
                return jsonify({
                    "error": f"Unexpected response from LLR API",
                    "message": llr_response.get('message'),
                    "status": llr_response.get('status')
                }), 400
                
        except requests.exceptions.RequestException as e:
            return jsonify({
                "error": f"LLR API request failed: {str(e)}"
            }), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/llr/check-status', methods=['POST'])
def check_llr_status():
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({"error": "Token is required"}), 400
        
        # Check token exists in our database
        token_doc = llr_tokens_collection.find_one({"token": token})
        if not token_doc:
            return jsonify({"error": "Invalid token"}), 404
        
        # Call LLR status API
        status_data = {"token": token}
        
        try:
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'ServiceHub-LLR/1.0'
            }
            
            response = requests.post(
                LLR_STATUS_API_URL, 
                data=status_data, 
                headers=headers,
                timeout=30
            )
            
            status_response = response.json()
            
            # Update token document with latest status
            update_data = {
                "lastChecked": datetime.utcnow(),
                "latestResponse": status_response
            }
            
            if status_response.get('status') == '200':
                # Completed successfully
                update_data['status'] = 'completed'
                update_data['completedAt'] = datetime.utcnow()
                update_data['pdfData'] = status_response.get('message')  # Base64 PDF data
                update_data['filename'] = status_response.get('filename')
                update_data['remarks'] = status_response.get('remarks')
            elif status_response.get('status') == '500':
                # Under process
                update_data['status'] = 'processing'
                update_data['queue'] = status_response.get('queue')
                update_data['remarks'] = status_response.get('remarks')
            elif status_response.get('status') == '300':
                # Refunded
                update_data['status'] = 'refunded'
                update_data['refundReason'] = status_response.get('message')
                
                # Process refund
                user = users_collection.find_one({"_id": token_doc['userId']})
                if user:
                    new_balance = user.get('walletBalance', 0) + token_doc['servicePrice']
                    users_collection.update_one(
                        {"_id": token_doc['userId']},
                        {"$set": {"walletBalance": new_balance}}
                    )
                    
                    # Add refund to payment history
                    description = f"Refund for LLR exam - Application: {token_doc['applno']}"
                    add_payment_history(str(token_doc['userId']), "refund", token_doc['servicePrice'], description, str(token_doc['_id']))
            
            llr_tokens_collection.update_one(
                {"_id": token_doc['_id']},
                {"$set": update_data}
            )
            
            return jsonify({
                "success": True,
                "status": status_response.get('status'),
                "message": status_response.get('message'),
                "queue": status_response.get('queue'),
                "remarks": status_response.get('remarks'),
                "filename": status_response.get('filename'),
                "pdfAvailable": status_response.get('status') == '200'
            })
            
        except requests.exceptions.RequestException as e:
            return jsonify({"error": f"Failed to connect to LLR status API: {str(e)}"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/llr/download-pdf', methods=['POST'])
def download_llr_pdf():
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({"error": "Token is required"}), 400
        
        # Get token document
        token_doc = llr_tokens_collection.find_one({"token": token})
        if not token_doc:
            return jsonify({"error": "Invalid token"}), 404
        
        if token_doc.get('status') != 'completed':
            return jsonify({"error": "PDF not available. Exam not completed yet."}), 400
        
        pdf_data = token_doc.get('pdfData')
        filename = token_doc.get('filename')
        
        if not pdf_data:
            return jsonify({"error": "PDF data not available"}), 404
        
        return jsonify({
            "success": True,
            "pdfData": pdf_data,
            "filename": filename,
            "mimeType": "application/pdf"
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/llr/user-tokens/<user_id>', methods=['GET'])
def get_user_llr_tokens(user_id):
    try:
        tokens = list(llr_tokens_collection.find({"userId": ObjectId(user_id)}).sort("createdAt", -1))
        for token in tokens:
            token['_id'] = str(token['_id'])
            token['userId'] = str(token['userId'])
            token['serviceId'] = str(token['serviceId'])
            # Remove sensitive PDF data from list view
            if 'pdfData' in token:
                del token['pdfData']
        
        return jsonify({"tokens": tokens})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Service Request APIs
@app.route('/api/user/services/<user_id>', methods=['GET'])
def get_user_services(user_id):
    try:
        # Check if user is blocked
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if user.get('isBlocked', False):
            return jsonify({"error": "Your account has been blocked. Please contact administrator."}), 403
        
        # Get active services
        services = list(services_collection.find({"isActive": True}))
        
        # Get user-specific prices
        user_prices = list(user_service_prices_collection.find({"userId": ObjectId(user_id)}))
        price_map = {str(price['serviceId']): price['price'] for price in user_prices}
        
        for service in services:
            service['_id'] = str(service['_id'])
            # Set user-specific price or default to service default price
            service['userPrice'] = price_map.get(service['_id'], service.get('defaultPrice', 0))
        
        return jsonify({"services": services})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/user/service-request', methods=['POST'])
def submit_service_request():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        service_id = data.get('serviceId')
        field_data = data.get('fieldData', {})
        
        if not user_id or not service_id:
            return jsonify({"error": "User ID and Service ID are required"}), 400
        
        # Get user and service details
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        service = services_collection.find_one({"_id": ObjectId(service_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if user.get('isBlocked', False):
            return jsonify({"error": "Your account has been blocked. Please contact administrator."}), 403
        
        if not service:
            return jsonify({"error": "Service not found"}), 404
        
        if not service.get('isActive', False):
            return jsonify({"error": "This service is currently unavailable"}), 400
        
        # Get user-specific price
        user_price = user_service_prices_collection.find_one({
            "userId": ObjectId(user_id),
            "serviceId": ObjectId(service_id)
        })
        
        service_price = user_price['price'] if user_price else service.get('defaultPrice', 0)
        
        if service_price <= 0:
            return jsonify({"error": "Service price not set for your account. Please contact administrator."}), 400
        
        # Check wallet balance
        if user.get('walletBalance', 0) < service_price:
            return jsonify({"error": "Insufficient wallet balance"}), 400
        
        # Deduct amount from wallet
        new_balance = user.get('walletBalance', 0) - service_price
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"walletBalance": new_balance}}
        )
        
        # Create service request
        request_doc = {
            "userId": ObjectId(user_id),
            "userName": user['name'],
            "userMobile": user['mobile'],
            "serviceId": ObjectId(service_id),
            "serviceName": service['name'],
            "servicePrice": service_price,
            "fieldData": field_data,
            "status": "pending",
            "adminMessage": "",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = service_requests_collection.insert_one(request_doc)
        request_id = result.inserted_id
        
        # Add payment history entry for service payment
        description = f"Payment for {service['name']} service"
        add_payment_history(user_id, "debit", service_price, description, str(request_id))
        
        return jsonify({
            "success": True,
            "message": "Service request submitted successfully",
            "requestId": str(request_id),
            "newWalletBalance": new_balance
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/service-requests', methods=['GET'])
def get_service_requests():
    try:
        requests = list(service_requests_collection.find({}).sort("createdAt", -1))
        for req in requests:
            req['_id'] = str(req['_id'])
            req['userId'] = str(req['userId'])
            req['serviceId'] = str(req['serviceId'])
        
        return jsonify({"requests": requests})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/service-request/<request_id>/respond', methods=['PUT'])
def respond_to_request(request_id):
    try:
        data = request.get_json()
        status = data.get('status')
        admin_message = data.get('adminMessage', '')
        
        if not status or status not in ['success', 'failed']:
            return jsonify({"error": "Status must be 'success' or 'failed'"}), 400
        
        # Get request details
        request_doc = service_requests_collection.find_one({"_id": ObjectId(request_id)})
        if not request_doc:
            return jsonify({"error": "Request not found"}), 404
        
        # Update request
        result = service_requests_collection.update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "status": status,
                    "adminMessage": admin_message,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Request not found"}), 404
        
        # If failed, refund the amount
        if status == 'failed':
            user = users_collection.find_one({"_id": request_doc['userId']})
            if user:
                new_balance = user.get('walletBalance', 0) + request_doc['servicePrice']
                users_collection.update_one(
                    {"_id": request_doc['userId']},
                    {"$set": {"walletBalance": new_balance}}
                )
                
                # Add payment history entry for refund
                description = f"Refund for failed {request_doc['serviceName']} service"
                add_payment_history(str(request_doc['userId']), "refund", request_doc['servicePrice'], description, request_id)
        
        return jsonify({"success": True, "message": "Response sent successfully"})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/user/service-requests/<user_id>', methods=['GET'])
def get_user_requests(user_id):
    try:
        requests = list(service_requests_collection.find({"userId": ObjectId(user_id)}).sort("createdAt", -1))
        for req in requests:
            req['_id'] = str(req['_id'])
            req['userId'] = str(req['userId'])
            req['serviceId'] = str(req['serviceId'])
        
        return jsonify({"requests": requests})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Payment History APIs
@app.route('/api/user/payment-history/<user_id>', methods=['GET'])
def get_user_payment_history(user_id):
    try:
        # Get payment history for the user
        history = list(payment_history_collection.find({
            "userId": ObjectId(user_id)
        }).sort("createdAt", -1))
        
        for entry in history:
            entry['_id'] = str(entry['_id'])
            entry['userId'] = str(entry['userId'])
            if entry.get('referenceId'):
                entry['referenceId'] = str(entry['referenceId'])
        
        return jsonify({"history": history})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        mobile = data.get('mobile')
        password = data.get('password')
        
        if not mobile or not password:
            return jsonify({"error": "Mobile number and password are required"}), 400
        
        user = users_collection.find_one({
            "mobile": mobile,
            "password": password
        })
        
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401
        
        if user.get('isBlocked', False):
            return jsonify({"error": "Your account has been blocked. Please contact administrator."}), 403
        
        return jsonify({
            "success": True,
            "user": {
                "id": str(user['_id']),
                "name": user['name'],
                "mobile": user['mobile'],
                "walletBalance": user.get('walletBalance', 0.0),
                "isBlocked": user.get('isBlocked', False)
            }
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/user/profile/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "user": {
                "id": str(user['_id']),
                "name": user['name'],
                "mobile": user['mobile'],
                "walletBalance": user.get('walletBalance', 0.0),
                "isBlocked": user.get('isBlocked', False)
            }
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# NEW API: Refresh user data endpoint
@app.route('/api/user/refresh/<user_id>', methods=['GET'])
def refresh_user_data(user_id):
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if user.get('isBlocked', False):
            return jsonify({"error": "Your account has been blocked. Please contact administrator."}), 403
        
        return jsonify({
            "success": True,
            "user": {
                "id": str(user['_id']),
                "name": user['name'],
                "mobile": user['mobile'],
                "walletBalance": user.get('walletBalance', 0.0),
                "isBlocked": user.get('isBlocked', False)
            }
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/user-service-prices/<user_id>', methods=['GET'])
def get_user_service_prices(user_id):
    try:
        # Get all services
        services = list(services_collection.find({}))
        
        # Get user-specific prices
        user_prices = list(user_service_prices_collection.find({"userId": ObjectId(user_id)}))
        price_map = {str(price['serviceId']): price['price'] for price in user_prices}
        
        service_prices = []
        for service in services:
            service_prices.append({
                "serviceId": str(service['_id']),
                "serviceName": service['name'],
                "price": price_map.get(str(service['_id']), service.get('defaultPrice', 0))
            })
        
        return jsonify({"servicePrices": service_prices})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, port=port)