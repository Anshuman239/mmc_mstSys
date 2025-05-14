from csv import DictReader
from functools import wraps
from flask import flash,request, redirect, url_for, session
from io import TextIOWrapper
from json import dumps, loads
from werkzeug.security import generate_password_hash

ALLOWED_EXTENSIONS = {'csv'}
MISSINGVAL = "Missing"
MAXGRADES = 100

# check if the file is allowed
def allowed_file(filename):
    """Check if the file is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def csvDataStreamToList(dataStream):
    file = TextIOWrapper(dataStream, encoding='utf-8-sig')
    rows = []
    data = DictReader(file)
    for row in data:
        rows.append(row)
    return rows

# Check if the user is logged in
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get("userid") is None:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


# # SECTION - MAKE DB FROM UPLOAD CSVs -------------------------------------------------
# populate user table
def populate_user_table(data, db, keys, user_type):
    """
    Populate user table with data from CSV file.
    
    Keys are the column names in the CSV file maped to username[0], full name[1], sex[2], email[3], phone[4].
    
    user_type is the type of user (superamdin, admin, editor, viewer).
    """

    total = 0
    for row in data:
        username = row[keys[0]].lower()
        email = row[keys[3]].lower()
        phone = row[keys[4]].lower()
        fullname = row[keys[1]].lower()
        sex = True if row[keys[2]].lower() == "male" else False
        
        # Generate passhash
        password = (get_hash(fullname, phone))
        

        try:
            db.execute(f"INSERT INTO users (username, passhash, fullname, sex, role_id, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(username) DO NOTHING",
                   (username, password, fullname, sex, user_type, email, phone))
            print(f"total inserts {total} full name {fullname}")
            total += 1
        except Exception as e:
            flash(f"Data missing Teacher or Student in CSV file. Please validate and try again. Error Type {e}", "danger")
            return redirect(url_for("index"))
    
    db.commit()
        

# generate password
def get_hash(name, phone):
    """
    Generate a password hash from first 3 chars of email and last 3 chars of phone number.

    Validate name and phone number befor passing to hash function.
    """

    # get firt 3 chars of email and last 3 chars of phone number
    # check if email and phone number are valid
    email_char = name[:3]
    phone_char = phone[-3:]
    if not email_char or not phone_char:
        raise ValueError("Invalid email or phone number format.")
    
    # generate password hash
    password = email_char + phone_char

    # check if password is valid
    # check if password is at least 6 characters long
    if len(password) < 6:
        flash("Error while generating password. Please check email and phone numbers in CSV files. All must be valid type.")
        return redirect(url_for("index"))
    
    return generate_password_hash(password)


# make programs table
def make_program_table(data, db, lastcol):
    """
    Create programs table from Program CSV

    lastcol (INTEGER) - it is last row past which list of teaches begin - INDEX strats from 1
    """
    failedrow = []

    for row in data:
        row_keys = list(row.keys())
        program_code = row["Program code"]
        program_name = row["Program name"]
        course_name = row["Course name"]
        
        # create list of teachers that teach that program to store in database
        for n in range(lastcol, len(row)):
            if row[row_keys[n]] == '':
                continue

            teacher_id = db.execute("SELECT id FROM users WHERE fullname=? AND role_id=?", (row[row_keys[n]].lower(), 3,)).fetchone()
            
            if teacher_id is None:
                failedrow.append(f"row number: {data.index(row)} Data: {row[row_keys[n]]}")
                t_id = MISSINGVAL
            else:
                t_id = teacher_id[0]
        
            # Section start from 0
            section = n - lastcol
            try:
                db.execute("INSERT INTO programs(program_code, program_name, program_section, course_name, max_grades, teacher_id) VALUES(?, ?, ?, ?, ?, ?)",
                        (program_code, program_name, section, course_name, MAXGRADES, t_id))
            except Exception as e:
                flash(f"Data missing in Programs CSV file. Please validate and try again. Error Type {e}", "danger")
                return redirect(url_for("index"))
            
    db.commit()
    return failedrow


# make studnet table
def make_students_table(data, db, lastcol):
    """
    Populate students table connected with

    lastcol (INTEGER) - it is last row past which list of subjects begin - INDEX strats from 1
    """

    for row in data:
        row_keys = list(row.keys())
        roll_no = row["rollno"]
        reg_no = row["registrationid"]
        section = section_to_int(row["section"])

        student_id = db.execute("SELECT id FROM users WHERE fullname = ?", (row["name"].lower(),)).fetchone()
        

        if student_id[0] is None:
            break
        
        print(f"student id = {student_id[0]}")

        course_ids = []
        grades = []
        for n in range(lastcol, len(row)):
            if row[row_keys[n]] == "":
                break
            
            course_id = db.execute("SELECT id FROM programs WHERE program_code = ? AND course_name = ?", (row["programcode"], row[row_keys[n]])).fetchone()
            print(f"course id = {course_id[0]}")
            course_ids.append(course_id[0])
            grades.append(0)
        
        try:
            db.execute("INSERT INTO students (roll_no, registration_id, section, grades, course_ids, user_id) VALUES(?, ?, ?, ?, ?, ?)", (roll_no, reg_no, section, dumps(grades), dumps(course_ids), student_id[0],))
        except Exception as e:
            flash(f"Data missing in Student CSV file. Please validate and try again. Error Type {e}", "danger")
            return redirect(url_for("index"))
    
    db.commit()


def section_to_int(char):
    c = char.lower()
    section = ord(c)
    return section


# # SECTION - GET DATA FROM DB--------------------------------------------------
# Get teachers list

# Get programs + sections list

# Get program students list
# Get Student Info

# Get program courses list


