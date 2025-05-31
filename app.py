import os
from dotenv import load_dotenv
from flask import Flask, flash, g, render_template, request, redirect, url_for, session, jsonify
from flask_session import Session
from werkzeug.security import generate_password_hash, check_password_hash
from sqlite3 import connect, Error, Row
from re import fullmatch, search

import model as m

from pprint import pp

app = Flask(__name__)

# load environment variables from .env file
load_dotenv()
REGISTERADMIN = os.environ.get("REGISTERADMIN")
ASCIIBASE = 65


# Set-up Server Session
app.secret_key = os.environ.get("SECRET_KEY")
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 5  # 5 MB
Session(app)

# Connect to SQLite database
def get_db():
    """ create a database connection to the SQLite database """
    db_file = os.environ.get("DATABASE_URL")
    
    if "db" not in g:
        try:
            g.db = connect(db_file)
            g.db.row_factory = Row
        except Error as e:
            print(e)
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


# Default route
@app.route('/', methods=['GET', 'POST'])
@m.login_required
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

# Route for the login page
@app.route('/login', methods=['GET', 'POST'])
def login():
    # if the user is already logged in, redirect to the home page
    if session.get("userid") is not None:
        return redirect(url_for("index"))

    # if the request method is POST, process the login form    
    if request.method == "POST":
        db = get_db()
        if db is None:
            flash("Database connection error please contact admin!", "danger")
            return redirect(url_for("login"))
        
        username = request.form.get("username")
        password = request.form.get("password")

        if not username or not password:
            flash("Please fill in all fields", "danger")
            return redirect(url_for("login"))
        
        # Check if the user exists in the database
        row = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

        if row is None:
            flash("Invalid username or password", "danger")
            return redirect(url_for("login"))
        
        # Check if the password is correct
        if not check_password_hash(row["passhash"], password):
            flash("Invalid username or password", "danger")
            return redirect(url_for("login"))
        
        session["userid"] = row["id"]
        session["username"] = row["username"]
        session["fullname"] = row["fullname"]
        session["role_id"] = row["role_id"]
        
        # Redirect to the home page
        flash("Logged in successfully", "success")
        return redirect(url_for("index"))
    
    # If the request method is GET, render the login page
    return render_template("login.html", title="Login")


# Route for the logout page
@app.route('/logout')
@m.login_required
def logout():
    session.clear()
    flash("You have been logged out", "success")
    return redirect(url_for("login"))


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

# Route for the register page - for admin HIDDEN
@app.route(f'/registeradmin{REGISTERADMIN}', methods=['GET', 'POST'])
def register():
    db = get_db()
    if db is None:
        flash("Database connection error please contact admin!", "danger")
        return redirect(url_for("index"))
    row = db.execute("SELECT * FROM users WHERE role_id = ?", (1,)).fetchone()

    # if user is already logged in, redirect to the home page
    if session.get("userid") is not None or row is not None:
        return redirect(url_for("index"))

    # if the request method is POST, process the registration form
    if request.method == "POST":
        db = get_db()
        if db is None:
            flash("Database connection error please contact admin!", "danger")
            return redirect(url_for("register"))
        
        # Get the form data
        username = request.form.get("username")
        password = request.form.get("password")
        confirm_password = request.form.get("cnf_password")
        fullname = request.form.get("fullname")
        email = request.form.get("email")
        phone = request.form.get("phone")
        try:
            role_id = int(request.form.get("role_id"))
        except ValueError:
            flash("Invalid role ID", "danger")
            return redirect(url_for("register"))
            

        # Validate the input fields
        if not username or not password or not confirm_password or not fullname or not email or not phone or not role_id:
            flash("Please fill in all fields", "danger")
            return redirect(url_for("register"))

        # format username to lowercase
        if not fullmatch(r"[a-zA-Z0-9_]{8,}", username):
            flash("Username can only contain letters, numbers, and underscores and must be 8 letters long.", "danger")
            return redirect(url_for("register"))
        

        # Validate the password
        if password != confirm_password:
            flash("Passwords do not match", "danger")
            return redirect(url_for("register"))

        # Validate the full name
        if not fullmatch(r"^[a-zA-Z\s]+$", fullname):
            flash("Full name can only contain letters and spaces", "danger")
            return redirect(url_for("register"))
        
        # Validate the email
        if not search(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email):
            flash("Invalid email format", "danger")
            return redirect(url_for("register"))
        # Validate the phone number
        if not fullmatch(r"\d{10}", phone):
            flash("Phone number can only be 10 digit number with no spaces", "danger")
            return redirect(url_for("register"))
        
        # Validate the role ID
        rows = db.execute("SELECT id FROM roles")
        ids = [row[0] for row in rows]
        
        if role_id not in ids:
            flash("Invalid role ID", "danger")
            return redirect(url_for("register"))

        # username check pass - convert to lowercase
        username = username.lower()

        # Check if the username already exists
        if db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone() is not None:
            flash("Username already exists", "danger")
            return redirect(url_for("register"))

        # Hash the password
        password_hash = generate_password_hash(password)

        # Insert the new user into the database
        db.execute("INSERT INTO users (username, passhash, fullname, role_id, email, phone) VALUES (?, ?, ?, ?, ?, ?)",
                   (username, password_hash, fullname, role_id, email, phone))
        db.commit()

        flash("Registered successfully", "success")
        return redirect(url_for("login"))
    
    # If the request method is GET, render the registration page
    return render_template("register.html", title="Register", registerKey=REGISTERADMIN)


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

    pp(responce_dict)

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


# Route for the upload page - UPLOAD CSV TO MAKE DATABASE
@app.route('/upload', methods=['GET', 'POST'])
@m.login_required
def upload():
    # if the request method is POST, process the upload form
    if request.method == "POST":
        # connect to DB if connect fails return immediately
        db = get_db()
        if db is None:
            flash("Database connection error please contact admin!", "danger")
            return redirect(url_for("upload"))
        
        cursor = db.cursor()
        
        # dict list containing values from uploaded CSV files
        csv_data = {"teacherdata":[], "studentdata":[], "programdata":[]}
        
        # check if the user is an super-admin
        if session.get("role_id") != 1:
            flash("You do not have permission to upload files", "danger")
            return redirect(url_for("index"))
        
        # Check if all required are uploaded by the user
        for key in csv_data.keys():
            if key not in request.files:
                flash(f"Missing file: {key}", "danger")
                return redirect(url_for("uplaod"))

            # Get if file submit
            file = request.files[key]

            # Check if file is empty
            if file.filename == "":
                flash(f"Missing file: {key}", "danger")
                return redirect(url_for("upload"))
            
            # Read and store data in list if file check pass
            if file and m.allowed_file(file.filename):
                csv_data[key] = m.csvDataStreamToList(file)
        

            
        # delete rows if exist before make
        db.execute("DELETE FROM users WHERE role_id != ?", (1,))
        db.execute("DELETE FROM programs")
        db.execute("DELETE FROM students")
        db.commit()

        # print(f"student len = {len(csv_data["studentdata"])} teacher len = {len(csv_data["teacherdata"])}")

        # Populate user Table with teacher data - role_id = 2 (editor)
        m.populate_user_table(csv_data["teacherdata"], db, cursor, ['e-mail', 'name', 'sex', 'e-mail', 'phone'], 3)
        m.populate_user_table(csv_data["studentdata"], db, cursor, ['registrationid', 'name', 'sex', 'e-mail', 'phone'], 4)
        program_log = m.make_program_table(csv_data["programdata"], db, cursor, 3)
        m.make_students_table(csv_data["studentdata"], db, cursor, 8)
        
        if len(program_log) > 0:
            flash(f"Data miss match in Programs CSV: {program_log}", "danger")

        flash("Users created succesfully!", "success")
        return redirect(url_for("index"))

    return render_template("upload.html", title="Upload CSV", specifier=".csv,text/csv", page='upload')