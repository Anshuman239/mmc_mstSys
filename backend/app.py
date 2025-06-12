import os
from flask_cors import CORS
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from flask import Flask, flash, g, render_template, request, redirect, url_for, session, jsonify
from flask_session import Session
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required, JWTManager, set_access_cookies, unset_jwt_cookies
import json
from werkzeug.security import generate_password_hash, check_password_hash
from sqlite3 import connect, Error, Row
from re import fullmatch, search

import model as m

app = Flask(__name__)


# load environment variables from .env file
load_dotenv()

REGISTERADMIN = os.environ.get("REGISTERADMIN")
ASCIIBASE = 65
USERNAME_RE = r"[a-zA-Z0-9_]{8,}"
PASSWORD_RE = r'(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,16}'
FULLNAME_RE = r"^[a-zA-Z\s']+$"
EMAIL_RE = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
PHONE_RE = r"\d{10}"

# Set-up Server Session
app.secret_key = os.environ.get("SECRET_KEY")
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 5  # 5 MB
app.config["JWT_COOKIE_SECURE"] = False                     # SET TRUE IN PRODUCTION
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_KEY")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)

jwt = JWTManager(app)
CORS(app, supports_credentials=True)



# Connect to SQLite database
def get_db():
    """ create a database connection to the SQLite database """
    db_file = os.environ.get("DATABASE_URL")
    
    if "db" not in g:
        try:
            g.db = connect(db_file)
            g.db.row_factory = Row
        except Error as e:
            return None
    return g.db


def remove_duplicates_in_list(dict_list, remove_key):
    keys_found = []
    for row in dict_list[:]:
        if row[remove_key] in keys_found:
            dict_list.remove(row)
            continue
        keys_found.append(row[remove_key])

# Close the database connection
@app.teardown_appcontext
def close_db(error):
    """ close the database connection """
    db = g.pop("db", None)
    if db is not None:
        db.close()


# Using an `after_request` callback, we refresh any token that is within 30
# minutes of expiring. Change the timedeltas to match the needs of your application.
# take from official flask_jwt_extended docs
# https://flask-jwt-extended.readthedocs.io/en/stable/refreshing_tokens.html
@app.after_request
def refresh_expiring_jwts(response):
    try:
        db = get_db()
        username = get_jwt_identity()
        exp_timestamp = get_jwt()['exp']
        now = datetime.now(timezone.utc)
        target_timestamp = datetime.timestamp(now + timedelta(minutes=30))
        if target_timestamp > exp_timestamp:
            row = db.execute("SELECT id, role_id FROM users WHERE username=?", (username,)).fetchone()
            additional_claims = {"role": row["role_id"], "user_id":row["id"]}
            access_token = create_access_token(identity=username, additional_claims=additional_claims)
            set_access_cookies (response, access_token)
        return response
    except (RuntimeError, KeyError):
        # Case where there is not a valid JWT. Just return the original response.
        try:
            data = response.get_json()
            if isinstance(data, dict) and data['response-type'] != 'login':
                user = {'isLoggedIn' : False}
                data['user'] = user
                response.set_data(json.dumps(data))
                unset_jwt_cookies(response)
        except:
            response = response
        return response



# Default route
@app.route('/', methods=['GET'])
@jwt_required()
def index():
    # SUPERADMIN dashboard
    if session["role_id"] == 1:
        db = get_db()
        programs = db.execute("SELECT DISTINCT program_code, program_name FROM programs").fetchall()
        teachers = db.execute("SELECT id, fullname, email, phone, sex FROM users WHERE role_id = ? ORDER BY fullname ASC", (3,)).fetchall()
        section = db.execute("SELECT DISTINCT program_code, program_section FROM programs").fetchall()

        programs_dict = [dict(row) for row in programs]
        teachers_dict = [dict(row) for row in teachers]
        sections_dict = []

        # convert section from int to uppercase char
        for row in section:
            dict_row = dict(row)
            dict_row["program_section"] = chr(dict_row["program_section"] + ASCIIBASE)
            sections_dict.append(dict_row)
        

        remove_duplicates_in_list(programs_dict, "program_code")
        remove_duplicates_in_list(teachers_dict, "fullname")
        
        return render_template("./superadmin/superadmin_dash.html", title="Home", page="dashboard", programs=programs_dict, teachers=teachers_dict,
                                sections=sections_dict)


    return render_template("dashboard.html", title="Home", page="dashboard")


@app.route('/auth/check')
@jwt_required()
def auth():
    db = get_db()
    username = get_jwt_identity()
    row = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    if row is None:
        return {'user': {'isLoggedIn': False}}
    user = {
        'isLoggedIn': True,
        'id': row['id'],
        'username': row['username'],
        'fullname': row['fullname'],
        'role': row['role_id']
    }   
    response = jsonify({'msg': 'auth successful', 'user': user, 'response-type': 'auth'})
    return response

# Route for the login page
@app.route('/login', methods=['POST'])
def login():
    db = get_db()
    if db is None:
        return {"msg": "Database connection error please contact admin!"}, 503
    
    data = request.get_json()
    username = data["username"].lower()
    password = data["password"]

    if not username or not password:
        return {"msg": "Please fill in all fields"}, 401
    
    # Check if the user exists in the database
    row = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

    if row is None or not check_password_hash(row["passhash"], password):
        return {"msg": "Invalid username or password"}, 401
    
    additional_calims ={"role": row["role_id"], "user_id":row["id"]}
    access_token = create_access_token(identity=row["username"], additional_claims=additional_calims)
    user = {
        'isLoggedIn': True,
        'id': row['id'],
        'username': row['username'],
        'fullname': row['fullname'],
        'role': row['role_id']
    }
    
    response = jsonify({'msg': 'login successful', 'user': user, 'response-type': 'login'})
    set_access_cookies(response, access_token)

    # Redirect to the home page
    return response


# Route for the logout page
@app.route('/logout')
@jwt_required()
def logout():
    response = jsonify({"msg": "logout successful", "isLoggedIn": False, 'response-type': 'logout'})
    unset_jwt_cookies(response)
    return response


# route to search programs
@app.route('/programs')
@m.login_required
def programs():
    # render programs details for super admin
    if session["role_id"] == 1:
        program_code = request.args.get("code")
        program_section = request.args.get("section")

        if not program_code or not program_section:
            flash("Invalid query.", "danger")
            return redirect(url_for("index"))
        
        db = get_db()

        students = db.execute('''SELECT DISTINCT users.fullname, students.roll_no, students.registration_id, programs.program_code,
                                students.course_id, programs.course_name
                                FROM users
                                JOIN students ON users.id = students.user_id
                                JOIN programs ON students.course_id = programs.id
                                WHERE students.section = ? AND programs.program_code = ?
                                ORDER BY students.roll_no ASC''',
                                (program_section, program_code)).fetchall()

        teachers = db.execute('''SELECT DISTINCT users.fullname, users.id, programs.course_name
                              FROM users
                              JOIN programs ON users.id = programs.teacher_id
                              WHERE programs.program_section = ? AND programs.program_code = ? AND users.role_id = ?
                              ORDER BY users.fullname ASC''',
                              (program_section, program_code, 3)).fetchall()


        students_dict = []
        teachers_dict = []
        
        
        # merge duplicates and add subjects to single list
        found = []
        for row in students:
            if row["registration_id"] in found:
                students_dict[len(students_dict) - 1]["course_name"].append(row["course_name"])
                students_dict[len(students_dict) - 1]["course_id"].append(row["course_id"])
                continue
            found.append(row["registration_id"])
            students_dict.append({"fullname": row["fullname"], "roll_no": row["roll_no"], "registration_id": row["registration_id"],
                                  "program_code": row["program_code"], "course_name": [row["course_name"]], "course_id": [row["course_id"]]})
            
        found.clear()

        for row in teachers:
            if row["id"] in found:
                teachers_dict[len(teachers_dict) - 1]["course_name"].append(row["course_name"])
                continue
            found.append(row["id"])
            teachers_dict.append({"fullname": row["fullname"], "teacher_id": row["id"], "course_name": [row["course_name"]]})


        return render_template("/superadmin/programs.html", students=students_dict, program_code=program_code, program_section=program_section, teachers=teachers_dict)
    
    return redirect(url_for("index"))


# Route for the register page
@app.route(f'/registeradmin', methods=['POST'])
def register():
    # if the request method is POST, process the registration form
    db = get_db()
    if db is None:
        return {"msg": "Failed to connet to database please contact admin!"}, 503
    
    # Get the form data
    data = request.get_json()
    username = data["username"].lower()
    password = data["password"]
    confirm_password = data["confirm_password"]
    fullname = data["fullname"]
    sex = False if data["sex"] == "Female" else True
    email = data["email"]
    phone = data["phone"]

    usertype = data["user_type"]

    try:
        r_id = db.execute("SELECT id FROM roles WHERE role = ?", (usertype.lower(),)).fetchone()
        role_id = r_id["id"]
    except ValueError:
        return {"msg": "Invalid role ID"}, 401
        

    # Validate the input fields
    if not username or not password or not confirm_password or not fullname or not email or not phone or not role_id:
        return {"msg": "Please fill in all fields"}, 401

    # format username to lowercase
    if not fullmatch(USERNAME_RE, username):
        return {"msg": "Username can only contain letters, numbers, and underscores and must be 8 letters long."}, 401
    

    # Validate the password
    if password != confirm_password:
        return {"msg": "Passwords do not match"}, 401
    
    if not fullmatch(PASSWORD_RE, password):
        return {'msg': 'Password not strong enough.'}, 401

    # Validate the full name
    if not fullmatch(FULLNAME_RE, fullname):
        return {"msg": "Full name can only contain letters and spaces"}, 401
    
    # Validate the email
    if not search(EMAIL_RE, email):
        return {"msg": "Invalid email format"}, 401
    # Validate the phone number
    if not fullmatch(PHONE_RE, phone):
        return {"msg": "Phone number can only be 10 digit number with no spaces"}, 401

    # Check if the username already exists
    if db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone() is not None:
        return {"msg": "Username already exists"}, 401

    # Hash the password
    password_hash = generate_password_hash(password)

    # Insert the new user into the database
    db.execute("INSERT INTO users (username, passhash, fullname, sex, role_id, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (username, password_hash, fullname, sex, role_id, email, phone))
    db.commit()

    return {"msg": "Registered successfully"}, 200


# route to AJAX query
@app.route('/query')
@m.login_required
def query():
    valid_queries = ["teachers", "students"]
    if session["role_id"] != 1:
        return "Access Denied"
    
    try:
        query_type = request.args.get("q")
    except:
        return "No query found."
        
    db = get_db()
    if query_type not in valid_queries:
        return "Access Denied"
    
    if query_type == "teachers":
        responce = db.execute("SELECT DISTINCT program_code, program_name, course_name, max_grades FROM programs").fetchall()

    responce_dict = [dict(row) for row in responce]

    return jsonify(responce_dict)


# route to search students
@app.route('/student')
@m.login_required
def student():
    student_id = request.args.get("id")

    if not student_id:
        flash ("Invalid request", "danger")
        return redirect(url_for("index"))
    
    db = get_db()

    student_info = db.execute('''SELECT users.id, users.fullname, users.sex, users.email, users.phone,
                                students.roll_no, students.registration_id, students.section, students.grade,
                                programs.program_code, programs.program_name, programs.course_name, programs.max_grades, programs.teacher_id
                                FROM users
                                JOIN students ON users.id = students.user_id
                                JOIN programs ON students.course_id = programs.id
                                WHERE students.registration_id = ? AND users.role_id = ?''',
                                (student_id, 4)).fetchall()
    
    student_info_dict = [dict(row) for row in student_info]

    for row in student_info_dict:
        try:
            teacher_name = dict(db.execute("SELECT fullname FROM users WHERE id=? AND role_id=?", (row["teacher_id"], 3)).fetchone())
        except:
            teacher_name = {"fullname": "not found"}
        row["teacher_name"] = teacher_name["fullname"]
        row["section"] = chr(row["section"] + 65)


    return render_template("student.html", user_type = session["role_id"], student_info=student_info_dict)


@app.route('/teacher')
@m.login_required
def teacher():
    teacher_id = request.args.get("id")

    if not teacher_id:
        flash("Invalid Request", "danger")
        return redirect(url_for("index"))
    
    db = get_db()

    teacher_info = db.execute('''SELECT users.id, users.fullname, users.email, users.phone, users.sex,
                              programs.program_code, programs.program_name, programs.course_name, programs.program_section, programs.max_grades
                              FROM users
                              JOIN programs ON users.id =  programs.teacher_id
                              WHERE users.id = ? AND users.role_id = ?''',
                              (teacher_id, 3)).fetchall()


    teacher_info_dict = []
    for row in teacher_info:
        teacher_info_dict.append(dict(row))
        teacher_info_dict[len(teacher_info_dict) - 1]["program_section"] = chr(teacher_info_dict[len(teacher_info_dict) - 1]["program_section"] + 65)
        

    return render_template("teacher.html", user_type=session["role_id"], teacher_info=teacher_info_dict)

 
validKeys = ['username', 'password', 'fullname', 'sex', 'email', 'phone']
validViewerKeys = ['username', 'password']
# Route to update user data
@app.route('/update/user/<username>', methods=['POST'])
@jwt_required()
def update(username):
    try:
        user = get_jwt()
        user_role = user.get('role')
        jwt_username = get_jwt_identity()
        data = request.get_json()
        key = data['key']
        updateValue = data['value']
        returnValue = updateValue        

        if user_role != 1 and username != jwt_username:
            return {'msg': 'access denied'}, 401

        # check invalid key
        if key not in validKeys:
            return {'msg': 'key value error'}, 401

        # invalid key from viewer right user
        if user_role == 4 and key not in validViewerKeys:
            return {'msg': 'access denied'}, 401
        
        # sanitising user input
        if key == 'username':
            if not fullmatch(USERNAME_RE, updateValue):
                return {"msg": "Username can only contain letters, numbers, and underscores and must be 8 letters long."}, 401
        
        if key == 'password':
            if not fullmatch(PASSWORD_RE, updateValue):
                return {'msg': 'Password not strong enough.'}, 401
            
        if key == 'fullname':
            if not fullmatch(FULLNAME_RE, updateValue):
                return {"msg": "Full name can only contain letters and spaces"}, 401
        
        if key == 'email':
            if not search(EMAIL_RE, updateValue):
                return {"msg": "Invalid email format"}, 401
            
        if key == 'phone':
            if not fullmatch(PHONE_RE, updateValue):
                return {"msg": "Phone number can only be 10 digit number with no spaces"}, 401
            
        db = get_db()

        check_id = db.execute(f"SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if check_id is None:
            return {'User not found.'}, 401


        if key == 'password':
            key = 'passhash'
            returnValue = '********'
            updateValue = generate_password_hash(updateValue)
        db.execute(f"UPDATE users SET {key} = ? WHERE username = ?", (updateValue, username,))
        db.commit()
        print(f'username = {username} and data = {data}')
    except:
        return {'msg': 'something went wrong'}, 503
    
    return {'updatedValue': returnValue}


# Route for the upload page - UPLOAD CSV TO MAKE DATABASE
@app.route('/upload', methods=['POST'])
@jwt_required()
def upload():
    user = get_jwt()
    # check if the user is an super-admin
    if user.get('role') != 1:
        return {'msg': 'You do not have permission to upload files'}, 401
    
    # connect to DB if connect fails return immediately
    db = get_db()
    if db is None:
        return {'msg': 'Database connection error please contact admin!'}, 503
    
    cursor = db.cursor()
    
    # dict list containing values from uploaded CSV files
    csv_data = {"teacherdata":[], "studentdata":[], "programdata":[]}
    
    
    # Check if all required are uploaded by the user
    for key in csv_data.keys():
        if key not in request.files:
            return {'msg': f'Missing file: {key}'}, 401

        # Get if file submit
        file = request.files.get(key)

        # Check if file is empty
        if file.filename == "":
            return {'msg': f'Empty file: {key}'}, 401
        
        # Read and store data in list if file check pass
        if file and m.allowed_file(file.filename):
            csv_data[key] = m.csvDataStreamToList(file)
    
    # delete rows if exist before make
    db.execute("DELETE FROM users WHERE role_id != ?", (1,))
    db.execute("DELETE FROM programs")
    db.execute("DELETE FROM students")
    db.commit()

    # Populate user Table with teacher data - role_id = 2 (editor)
    m.populate_user_table(csv_data["teacherdata"], db, cursor, ['e-mail', 'name', 'sex', 'e-mail', 'phone'], 3)
    m.populate_user_table(csv_data["studentdata"], db, cursor, ['registrationid', 'name', 'sex', 'e-mail', 'phone'], 4)
    program_log = m.make_program_table(csv_data["programdata"], db, cursor, 3)
    m.make_students_table(csv_data["studentdata"], db, cursor, 8)
    
    return {'msg': f"Data miss match in Programs CSV: {program_log}"}


@app.route('/user/<username>')
@jwt_required()
def userinfo(username):
    try:
        user = get_jwt()
        jwt_username = get_jwt_identity()
        role = user.get('role')

        if role != 1 and username != jwt_username:
            return {'msg': 'access denied.'}, 401

        db = get_db()
        row = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()

        user = {'username': row['username'],
                'fullname': row['fullname'],
                'sex': 'Male' if row['sex'] == 1 else 'Female',
                'email': row['email'],
                'phone': row['phone']}
        
        return {'user': user}
    except:
        return {'msg': 'user not found'}, 401

