from csv import DictReader
from io import TextIOWrapper
from werkzeug.security import generate_password_hash
from concurrent.futures import ThreadPoolExecutor

ALLOWED_EXTENSIONS = {'csv'}
MISSINGVAL = 10000
MAXGRADES = 100

# check if the file is allowed
def allowed_file(filename):
    """Check if the file is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# yeild slice of list - used to batch insert into database 
def chunk(all_rows, size):
    for i in range(0, len(all_rows), size):
        yield all_rows[i:i+size]


def csvDataStreamToList(dataStream):
    file = TextIOWrapper(dataStream, encoding='utf-8-sig')
    rows = []
    data = DictReader(file)
    for row in data:
        rows.append(row)
    return rows


# # SECTION - MAKE DB FROM UPLOAD CSVs -------------------------------------------------
# populate user table
def populate_user_table(data, db, cursor, keys, user_type):
    """
    Populate user table with data from CSV file.
    
    Keys are the column names in the CSV file maped to username[0], full name[1], sex[2], email[3], phone[4].
    
    user_type is the type of user (superamdin, admin, editor, viewer).
    """
    
    batch = []
    passwords = []
    for row in data:
        passwords.append((get_pass(row[keys[3]].lower(), row[keys[4]].lower())))

    with ThreadPoolExecutor() as executor:
        pass_hash = list(executor.map(hash_password, passwords))

    # Generate passhash

    for row in data:
        username = row[keys[0]].lower()
        email = row[keys[3]].lower()
        phone = row[keys[4]].lower()
        fullname = row[keys[1]]
        sex = True if row[keys[2]].lower() == "male" else False
        hash = pass_hash[data.index(row)]

        batch.append((username, hash, fullname, sex, user_type, email, phone))

    try:
        db.execute("BEGIN")
        for b in chunk(batch, 500):
            cursor.executemany(f"INSERT INTO users (username, passhash, fullname, sex, role_id, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)", b)
    except Exception as e:
        print(f"ERROR - {e}")
    
    db.commit()


# generate password
def get_pass(param1, param2):
    """
    Generate a password hash from first 3 chars of email and last 3 chars of phone number.

    Validate name and phone number befor passing to hash function.
    """

    # get firt 3 chars of email and last 3 chars of phone number
    # check if email and phone number are valid
    param1_char = param1[:3]
    param2_char = param2[-3:]
    if not param1_char or not param2_char:
        raise ValueError("Invalid email or phone number format.")
    
    # generate password hash
    password = param1_char + param2_char

    # check if password is valid
    # check if password is at least 6 characters long
    if len(password) < 6:
        return {'msg': 'unbale to generate password!'}, 401
    
    return password


# wrapper function for ThreadPoolExecutor
def hash_password(password):
    return generate_password_hash(password, method='pbkdf2:sha256:10000')


# make programs table
def make_program_table(data, db, cursor, lastcol):
    """
    Create programs table from Program CSV

    lastcol (INTEGER) - it is last row past which list of teaches begin - INDEX strats from 1
    """

    db.execute("INSERT INTO users (id, username, passhash, fullname, sex, role_id, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
               (10000, "Missing", "Missing", "Missing", 0, 3, "Missing", "Missing"))
    db.commit()
    
    failedrow = []
    batch = []
    teachers_ids = db.execute("SELECT id, fullname FROM users WHERE role_id = 3").fetchall()
    teachers_ids_dict = {row['fullname']:row['id'] for row in teachers_ids}

    for row in data:
        row_keys = list(row.keys())
        program_code = row["Program code"]
        program_name = row["Program name"]
        course_name = row["Course name"]
        
        # create list of teachers that teach that program to store in database
        for n in range(lastcol, len(row)):
            if row[row_keys[n]] == '':
                continue

            try:
                teacher_id = teachers_ids_dict[row[row_keys[n]]]
            except:
                t_id = MISSINGVAL
                
            # db.execute("SELECT id FROM users WHERE fullname=? AND role_id=?", (row[row_keys[n]], 3,)).fetchone()
            
            if not teacher_id:
                 failedrow.append(f"row number: {data.index(row)} Data: {row[row_keys[n]]}")
                 t_id = MISSINGVAL
            else:
                t_id = teacher_id
        
            # Section start from 0
            section = n - lastcol

            batch.append((program_code, program_name, section, course_name, MAXGRADES, t_id))
            # print(f"program_code = {program_code}, program_name = {program_name}, section = {section}, course_name = {course_name}")        
    try:
        db.execute("BEGIN")
        for b in chunk(batch, 500):
            cursor.executemany("INSERT INTO programs(program_code, program_name, program_section, course_name, max_grades, teacher_id) VALUES(?, ?, ?, ?, ?, ?)", b)
            db.commit()    
    except Exception as e:
        print(f"Data missing in Programs CSV file. Please validate and try again. Error Type {e}")
            
    return failedrow


import pprint
# make studnet table
def make_students_table(data, db, cursor, lastcol):
    """
    Populate students table connected with

    lastcol (INTEGER) - it is last row past which list of subjects begin - INDEX strats from 1
    """ 
    for s in range (0, 11):
        db.execute("INSERT INTO programs (program_code, program_name, program_section, course_name, max_grades, teacher_id) VALUES (?,?,?,?,?,?)",
                    ("Missing", "Missing", s, "Missing", 0, MISSINGVAL))
    db.commit()    
    
    batch = []
    students_ids = db.execute("SELECT username, id FROM users WHERE role_id = 4").fetchall()
    students_ids_dict = {row['username']:row['id'] for row in students_ids}

    course_ids = db.execute("SELECT DISTINCT id, program_code, course_name, program_section FROM programs").fetchall()
    course_ids_dict = {}
    for row in course_ids:
        prg_c = row['program_code']
        crs_n = row['course_name']
        crs_s = row['program_section']
        i = row['id']
        course_ids_dict[(prg_c,crs_n,crs_s)] = i

    for row in data:
        row_keys = list(row.keys())
        roll_no = row["rollno"]
        reg_no = row["registrationid"]
        section = section_to_int(row["section"])

        student_id = students_ids_dict[f'{reg_no}']

        if student_id is None:
            continue

        grades = 0
        for n in range(lastcol, len(row)):
            if row[row_keys[n]] == "":
                break
            try:
                course_id = course_ids_dict[(row["programcode"],row[row_keys[n]],section)]
                # print(course_id)
            except:
                course_id = course_ids_dict[("Missing","Missing",section)]

            batch.append((roll_no, reg_no, section, grades, course_id, student_id,))
    
    try:
        db.execute("BEGIN")
        for b in chunk(batch, 500):
            cursor.executemany("INSERT INTO students (roll_no, registration_id, section, grade, course_id, user_id) VALUES(?, ?, ?, ?, ?, ?)", b)
    except Exception as e:
        print(f'Error occured while uploading CSV {e}')
    
    db.commit()


def section_to_int(char):
    c = char.lower()
    section = ord(c) - 97
    return section