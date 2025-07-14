import { useEffect, useState, createContext, useContext, } from 'react';
import { BrowserRouter, useNavigate, Routes, Route, Link, Outlet, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from './navbar.jsx';
import Footer from './footer.jsx';
import './Zephyr/bootstrap.css'

const API = '/api'
// const API = "http://127.0.0.1:8000"
const USER_TYPES = ["Superadmin", "Admin", "Editor", "Viewer"];
const UserContext = createContext(null);

// RegEx for input validation
const usernameRE = /^[a-zA-Z0-9_]{8,32}$/;
const fullnameRE = /^[a-zA-Z\s']+$/;
const emailRE = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
const phoneRE = /^\d{10}$/;
const passwordRE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,16}$/


function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [id, setId] = useState(-1);
  const [username, setUsername] = useState('');
  const [fullname, setFullname] = useState('');
  const [role, setRole] = useState(-1);

  const user = {
    isLoggedIn, setIsLoggedIn,
    id, setId,
    username, setUsername,
    fullname, setFullname,
    role, setRole
  }

  useEffect(() => {
    axios.get(API + '/auth/check', { withCredentials: true })
      .then(response => {
        const data = response.data;
        if (response.status == 200 && data.user.isLoggedIn) {
          user.setIsLoggedIn(data.user.isLoggedIn);
          user.setId(data.user.id);
          user.setUsername(data.user.username);
          user.setFullname(data.user.fullname);
          user.setRole(data.user.role);
        }
      }).catch((error) => {
        // console.log(error)
        user.setIsLoggedIn(false);
      }).finally(() => {
        setAuthChecked(true);
      })
  }, []);

  const signOut = async () => {
    axios.get(API + '/logout', {
      withCredentials: true
    }).then(res => {
      if (res.status === 200) {
        user.setIsLoggedIn(false);
        user.setId(-1);
        user.setUsername('');
        user.setFullname('');
        user.setRole(-1);
      }
    }).catch(e => {
      alert('Failed to signout.')
      //console.log('Unable to signout, error code: ', e.response.status);
    });
  }

  return (
    <BrowserRouter>
      <div className='container-flex'>
        <UserContext.Provider value={user}>
          <Navbar signOut={signOut} userContext={UserContext} />
          <Routes>
            <Route path='/login' element={!authChecked ? <>Loading...</> : isLoggedIn ? <Navigate to='/' /> : <LoginPage />} />
            <Route path='/registeradmin' element={!authChecked ? <>Loading...</> : isLoggedIn ? <Navigate to='/' /> : <RegisterPage />} />
            <Route path='/' element={!authChecked ? <>Loading...</> : isLoggedIn ? <Index /> : <Navigate to='/login' />} />
            <Route path='/profile/user/:user_name' element={!authChecked ? <>Loading...</> : isLoggedIn ? <ProfilePage /> : <Navigate to='/login' />} />
            <Route path='/upload' element={!authChecked ? <>Loading...</> : isLoggedIn && user.role == 1 ? (<UploadCSV />) : (<Navigate to='/login' />)} />
            <Route path='/programs/:program_name/:section' element={!authChecked ? <>Loading...</> : isLoggedIn && [1, 2, 3].includes(user.role) ? (<ProgramDetails />) : (<Navigate to='/login' />)} />
          </Routes>
          <Footer />
        </UserContext.Provider>
      </div>
    </BrowserRouter>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [isDataLoad, setIsDataLoad] = useState(false);

  useEffect(() => {
    axios.get(API + '/data', { withCredentials: true })
      .then(response => {
        const data = response.data;
        if (response.status === 200) {
          setPrograms(data.programs);
          setTeachers(data.teachers);
          setSections(data.sections);
        }
        // console.log(data);
      })
      .catch(error => {
        // console.log(error);
        alert('An error occured while fetching data');
      })
      .finally(() => {
        setIsDataLoad(true);
      });
  }, []);


  const teachersTable = (
    <table className='table table-striped'>
      <thead>
        <tr>
          <th>S.no.</th>
          <th>Teacher name</th>
          <th>Sex</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {teachers.map((teacher, index) => {
          return (
            <tr key={teacher.id}>
              <td>{index + 1}</td>
              <td>{teacher.fullname.split(' ').map((e) => {
                return e.charAt(0).toUpperCase() + e.substring(1,) + " ";
              })}</td>
              <td>{teacher.sex === 0 ? 'Male' : 'Female'}</td>
              <td>{teacher.email}</td>
              <td>{teacher.phone}</td>
              <td>
                <button className='btn btn-secondary p-1' onClick={() => navigate('/profile/user/' + teacher.username)}>
                  <span className="material-symbols-outlined align-bottom">
                    search
                  </span>
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <>
      <div className='container-sm my-3'>
        <ul className="nav nav-tabs" id="myTab" role="tablist">
          <li className="nav-item" role="presentation">
            <button className="nav-link active" id="programs-tab" data-bs-toggle="tab" data-bs-target="#programs" type="button" role="tab" aria-controls="programs" aria-selected="true">Programs</button>
          </li>
          <li className="nav-item" role="presentation">
            <button className="nav-link" id="teacters-tab" data-bs-toggle="tab" data-bs-target="#teacters" type="button" role="tab" aria-controls="teacters" aria-selected="false">Teachers</button>
          </li>
        </ul>
        <div className="tab-content" id="myTabContent">
          <div className="tab-pane fade show active" id="programs" role="tabpanel" aria-labelledby="programs-tab">
            <table className='table table-striped'>
              <thead>
                <tr>
                  <th>S.no.</th>
                  <th>Program Code</th>
                  <th>Section</th>
                  <th>Program Name</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {isDataLoad ?
                  programs.map((element, index) => {
                    return <ProgramsRow key={index} program={element} index={index} sections={sections} />
                  })
                  :
                  <tr><td>Getting Data...</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="tab-pane fade" id="teacters" role="tabpanel" aria-labelledby="teacters-tab">
            {teachersTable}
          </div>
        </div>
      </div>
    </>
  );
}


function ProgramsRow({ program, index, sections }) {
  const navigate = useNavigate();
  const [sec, setSec] = useState('A');
  return (
    <tr key={program.program_code}>
      <td>{index + 1}</td>
      <td>{program.program_code}</td>
      <td>
        <span className="d-md-inline-flex">
          <select className="form-select form-select-sm" name="program_section" value={sec} onChange={e => setSec(e.target.value)}>
            {sections.map((element) => {
              return (
                element.program_code === program.program_code &&
                <option key={element.id}>
                  {element.program_section}
                </option>

              )
            })}
          </select>
        </span>
      </td>
      <td>{program.program_name}</td>
      <td>
        <button className='btn btn-secondary p-1' onClick={() => navigate('/programs/' + encodeURI(program.program_code) + '/' + encodeURI(sec))}>
          <span className="material-symbols-outlined align-bottom">
            search
          </span>
        </button>
      </td>
    </tr>
  )
};


function TeacherDashboard() {
  const [programs, setPrograms] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const navigate = useNavigate()

  useEffect(() => {
    axios.get(API + '/data', { withCredentials: true })
      .then(response => {
        if (response.status === 200) {
          setPrograms(response.data.programs);
          //console.log(response.data)
        }
      })
      .catch(error => {
        alert('Unable to fetch data');
      })
      .finally(() => {
        setIsDataLoaded(true);
      });
  }, [])

  return (
    <div className='container mt-4'>
      <div className='mb-3'><h5>Select Program to grade.</h5></div>
      {isDataLoaded
        ?
        <table className='table table-striped'>
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Code</th>
              <th>Section</th>
              <th>Program Name</th>
              <th>Course</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {
              programs.map((element, index) => {
                return (
                  <tr key={element.id}>
                    <th>{index + 1}</th>
                    <td>{element.program_code}</td>
                    <td>{String.fromCharCode(element.program_section + 65)}</td>
                    <td>{element.program_name}</td>
                    <td>{element.course_name}</td>
                    <td>
                      <button className='btn btn-secondary p-1' onClick={() => navigate('/programs/' +
                        encodeURI(element.program_code) + '/' + encodeURI(element.program_section) + '?coursename=' + encodeURI(element.course_name))}>
                        <span className="material-symbols-outlined align-bottom">
                          search
                        </span>
                      </button>
                    </td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
        :
        <div>Getting Data...</div>
      }
    </div>
  );
}

function StudentDashboard() {
  const [studentInfo, setStudentInfo] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    axios.get(API + '/data', { withCredentials: true })
      .then(response => {
        if (response.status === 200) {
          setStudentInfo(response.data.studentInfo);
          // console.log(response.data);
        }
      })
      .catch(error => {
        alert('Failed to get data.')
      })
      .finally(() => setIsDataLoaded(true))
  }, []);

  return (
    <>
      {isDataLoaded
        ?
        <div className='container my-3'>
          <div className='container shadow-lg rounded'>
            <div className='row border-bottom py-3'>
              <div className='col-2 fw-semibold'>Roll No</div>
              <div className='col-auto'>{studentInfo[0].roll_no}</div>
            </div>
            <div className='row border-bottom py-3'>
              <div className='col-2 fw-semibold'>Registration ID</div>
              <div className='col-auto'>{studentInfo[0].registration_id}</div>
            </div>
            <div className='row border-bottom py-3'>
              <div className='col-2 fw-semibold'>Program Code</div>
              <div className='col-auto'>{studentInfo[0].program_code}</div>
            </div>
            <div className='row border-bottom py-3'>
              <div className='col-2 fw-semibold'>Program Name</div>
              <div className='col-auto'>{studentInfo[0].program_name}</div>
            </div>
            <div className='row border-bottom py-3'>
              <div className='col-2 fw-semibold'>Section</div>
              <div className='col-auto'>{String.fromCharCode(studentInfo[0].program_section + 65)}</div>
            </div>
          </div>
          <table className='table table-striped'>
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Subject</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {studentInfo.map((element, index) => {
                return (
                  <tr key={element.id}>
                    <td>{index + 1}</td>
                    <td>{element.course_name}</td>
                    <td><span className='fw-semibold'>{element.grade}</span> / {element.max_grades}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        :
        <>Loading...</>
      }
    </>
  );
}

function Index() {
  const user = useContext(UserContext);

  return (
    <>
      <div className='container-sm pt-5'>
        <div>
          <h4>{user.fullname}'s Dashboard</h4>
        </div>
      </div>
      {user.role === 1 && <AdminDashboard />}
      {user.role === 3 && <TeacherDashboard />}
      {user.role === 4 && <StudentDashboard />}
    </>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const user = useContext(UserContext);
  const [isSubmited, setIsSubmited] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username && password) {
      axios.post(API + '/login', {
        username: username,
        password: password
      }, { withCredentials: true }).then(response => {
        const data = response.data;
        if (response.status == 200) {
          user.setIsLoggedIn(data.user.isLoggedIn);
          user.setId(data.user.id);
          user.setUsername(data.user.username);
          user.setFullname(data.user.fullname);
          user.setRole(data.user.role);
        }
      }).catch(error => {
        alert("An error occured while attempting to login!")
        // console.log('Post error: ', error.response);
      }).finally(() => {
        navigate('/');
      });
    }
  }

  return (
    <div className='container w-100 m-auto'>
      <div className="text-center mt-5">
        <h1>Multani Mal Modi College MST Portal</h1>
        <p className="lead">Sign in to your account</p>
      </div>
      <div className="row justify-content-center">
        <div className="col-md-3 p-4 shadow-lg bg-body-tertiary rounded">
          <h3>Sign-In</h3>
          <form onSubmit={(e) => {
            setIsSubmited(true)
            handleSubmit(e)
          }}>
            <FormInputField fieldType='text' fieldName='Username'
              fieldValue={username} onValueChange={setUsername} />
            <FormInputField fieldType='password' fieldName='Password'
              fieldValue={password} onValueChange={setPassword} />
            {isSubmited
              ?
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              :
              <input className='btn btn-primary' type='submit' value='Login' />
            }
          </form>
        </div>
      </div>
    </div>
  );
}

function ProfilePage() {
  const { user_name } = useParams();
  const role = useContext(UserContext).role;
  const postAddress = '/update/user/' + user_name;

  const loaction = useLocation();

  const [isFetchUserData, setIsFetchUserData] = useState(true);

  const [username, setUsername] = useState(user_name);
  const [fullname, setFullname] = useState('');
  const [password, setPassword] = useState('********');
  const [sex, setSex] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    axios.get(API + `/user/${user_name}`, { withCredentials: true })
      .then(response => {
        const data = response.data;
        if (response.status == 200) {
          setUsername(data.user.username);
          setFullname(data.user.fullname);
          setSex(data.user.sex);
          setEmail(data.user.email);
          setPhone(data.user.phone);
        }
      }).catch((error) => {
        alert(error.response.data.msg);
      }).finally(() => {
        setIsFetchUserData(false);
      })
  }, [loaction.pathname, user_name]);

  return (
    isFetchUserData
      ?
      <div>Fetching user data</div>
      :
      <div className='container shadow p-3 mt-5 bg-body-tertiary rounded'>
        <h3 className='fw-bold'>Your Profile</h3>
        <div className='row mt-3'>
          <ProfileRow
            type='text'
            title='Full Name'
            data={fullname}
            dbKey='fullname'
            setData={setFullname}
            isEdit={[1, 2, 3].includes(role)}
            regex={fullnameRE}
            errorMsg="Only Alphabets, Space and ' allowed."
            postAddress={postAddress} />
          <ProfileRow
            title='Sex'
            data={sex}
            setData={setSex}
            dbKey='sex'
            isEdit={[1, 2, 3].includes(role)}
            isDropDown={true}
            postAddress={postAddress} />
          <ProfileRow
            type='text'
            title='Username'
            data={username}
            dbKey='username'
            setData={setUsername}
            dataType='username'
            isEdit={true}
            isNeedConfirm={true}
            regex={usernameRE}
            errorMsg='Minimum 8 characters. Only alphabets, numbers and _ allowed'
            postAddress={postAddress} />
          <ProfileRow
            type='password'
            title='Password'
            data={password}
            dbKey='password'
            setData={setPassword}
            isEdit={true}
            isNeedConfirm={true}
            regex={passwordRE}
            errorMsg='Password must be 8-16 characters long. It must have one lower case, upper case, digit and special character in it.'
            postAddress={postAddress} />
          <ProfileRow
            type='email'
            title='Email'
            dbKey='email'
            data={email}
            setData={setEmail}
            isEdit={[1, 2, 3].includes(role)}
            regex={emailRE}
            errorMsg='Input valid email address.'
            postAddress={postAddress} />
          <ProfileRow
            type='phone'
            title='Phone'
            data={phone}
            dbKey='phone'
            setData={setPhone}
            isEdit={[1, 2, 3].includes(role)}
            regex={phoneRE}
            errorMsg='Input 10 digit phone number.'
            postAddress={postAddress} />
        </div>
      </div>
  );
}


function ProgramDetails() {
  const [searchParam] = useSearchParams();
  const { program_name, section } = useParams();
  const user_role = useContext(UserContext).role;
  const coursename = searchParam.get('coursename');

  return (
    coursename
      ?
      <CourseGradePage program_name={program_name} section={section} course_name={coursename} />
      :
      <>
        {
          user_role == 1
            ?
            <AdminProgramPage program_name={program_name} section={section} />
            :
            <>{alert('access denied.')}</>
        }
      </>
  )

}

function AdminProgramPage({ program_name, section }) {
  const [students, setStudents] = useState([]);
  const [teacters, setTeachers] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    axios.get(API + '/programs/' + decodeURI(program_name) + '/' + decodeURI(section), { withCredentials: true })
      .then(response => {
        const data = response.data;
        if (response.status === 200) {
          setStudents(data.students);
          setTeachers(data.teachers);
        }
        //console.log(data);
      })
      .catch(error => {
        alert('Failed to get data.')
        //console.log(error)
      })
      .finally(setIsDataLoaded(true));
  }, []);

  return (
    <>
      <div className='container-sm my-3'>
        <h3>{program_name} details:</h3>
        <ul className="nav nav-tabs" id="myTab" role="tablist">
          <li className="nav-item" role="presentation">
            <button className="nav-link active" id="programs-tab" data-bs-toggle="tab" data-bs-target="#programs" type="button" role="tab" aria-controls="programs" aria-selected="true">Students</button>
          </li>
        </ul>
        <div className="tab-content" id="myTabContent">
          <div className="tab-pane fade show active" id="programs" role="tabpanel" aria-labelledby="programs-tab">
            <table className='table table-striped table-hover'>
              <thead>
                <tr>
                  <th>S.no.</th>
                  <th>Student Name</th>
                  <th>Roll No.</th>
                  <th>Registration ID</th>
                  <th>Detailes</th>
                </tr>
              </thead>
              <tbody>
                {isDataLoaded
                  ?
                  students.map((element, index) => {
                    return <StudentRow key={index} student={element} index={index} teachers={teacters} />
                  })
                  :
                  <tr><td>Loading...</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

function CourseGradePage({ program_name, section, course_name }) {
  const [students, setStudents] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    const getaddress = '/programs/' + encodeURI(program_name) + '/' + encodeURI(section) + '?coursename=' + encodeURI(course_name)
    axios.get(API + getaddress,
      { withCredentials: true })
      .then(response => {
        if (response.status === 200) {
          setStudents(response.data.students);
          //console.log(response.data.students);
        }
      })
      .catch(error => {
        alert('Error while getting data.');
      })
      .finally(() => setIsDataLoaded(true));
  }, []);

  return (
    <>{isDataLoaded
      ?
      <div className='container mt-5'>
        <div className='container shadow p-3 mb-5 bg-body-tertiary rounded'>
          <div className='row border-bottom py-3'>
            <div className='col-2 fw-semibold'>Program Code</div>
            <div className='col-auto'>{students[0].program_code}</div>
          </div>
          <div className='row border-bottom py-3'>
            <div className='col-2 fw-semibold'>Program Name</div>
            <div className='col-auto'>{students[0].program_name}</div>
          </div>
          <div className='row border-bottom py-3'>
            <div className='col-2 fw-semibold'>Section</div>
            <div className='col-auto'>{String.fromCharCode(students[0].program_section + 65)}</div>
          </div>
          <div className='row py-3'>
            <div className='col-2 fw-semibold'>Course Name</div>
            <div className='col-auto'>{students[0].course_name}</div>
          </div>
        </div>
        <table className='table table-striped'>
          <thead>
            <tr>
              <th>Roll No</th>
              <th>Name</th>
              <th>Registration No</th>
              <th>Grade</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {students.map((element) => {
              return (
                <tr key={element.id}>
                  <td>{element.roll_no}</td>
                  <td>{element.fullname}</td>
                  <td>{element.registration_id}</td>
                  <GradeStudents student={element} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      :
      <>
        Loading...
      </>
    }</>
  );
}

function StudentRow({ student, index, teachers }) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr onClick={() => setIsExpanded(!isExpanded)}>
        <td>{index + 1}</td>
        <td>{student.fullname.split(' ').map((e) => {
          return e.charAt(0).toUpperCase() + e.substring(1,) + ' '
        })}</td>
        <td>{student.roll_no}</td>
        <td>{student.registration_id}</td>
        <td>
          {isExpanded
            ?
            <button className='btn btn-secondary p-1' onClick={() => setIsExpanded(false)}>
              <span className="material-symbols-outlined align-bottom">
                stat_1
              </span>
            </button>
            :
            <button className='btn btn-secondary p-1' onClick={() => setIsExpanded(true)}>
              <span className="material-symbols-outlined align-bottom">
                stat_minus_1
              </span>
            </button>
          }
        </td>
      </tr>
      {isExpanded &&
        <tr>
          <td colSpan={'5'}>
            <table className='table table-striped-columns'>
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>Subjects</th>
                  <th>Marks</th>
                  <th>Teacher</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {
                  student.course_id.map((e, index) => {
                    return (<StudentStubjectsRow key={index} teachers={teachers} student={student} index={index} rowKey={e} />);
                  })
                }
                <tr>
                  <td>
                    <button className='btn btn-primary p-1 mx-1' onClick={() => navigate('/profile/user/' + student.username)}>
                      Profile
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      }
    </>
  );
}

function StudentStubjectsRow({ teachers, student, index, rowKey }) {
  const [isGradeEdit, setIsGradeEdit] = useState(false)
  const [isSpinner, setIsSpinner] = useState(false)
  const [updatedGrade, setUpdatedGrade] = useState(student.grades[index].toString())

  const handleGradeUpdate = async () => {
    setIsSpinner(true);
    const updateInput = updatedGrade.trim();
    const csrfToken = getCookie('csrf_access_token');

    if (updateInput != student.grades[index] && updateInput != '' && /\S/.test(updateInput)) {
      axios.post(API + '/update/grades/' + student.program_code + '/' + student.program_section, {
        'registration_id': student.registration_id,
        'course_id': student.course_id[index],
        'new_grade': updateInput
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken
        },
        withCredentials: true
      })
        .then(response => {
          if (response.status === 200)
            student.grades[index] = updateInput;
        })
        .catch(error => {
          alert('Faild to update student grade.')
        })
        .finally(() => {
          setIsGradeEdit(false);
          setIsSpinner(false);
        });
    }
  }

  return (
    <tr key={rowKey}>
      <td>{index + 1}</td>
      <td>{student.course_name[index]}</td>
      <td>
        <div className='row d-flex align-items-center'>
          {isGradeEdit
            ?
            <div className='col-auto mx-0'>
              <input value={updatedGrade}
                onChange={(v) => {
                  if (v.target.value <= student.max_grades[index])
                    setUpdatedGrade(v.target.value);
                }}
                className='form-control form-control-sm' maxLength={'3'}
                style={{ width: '40px' }}></input>
            </div>
            :
            <div className='col-auto pe-1'>
              {student.grades[index]}
            </div>
          }
          <div className='col-auto ps-1'>/ {student.max_grades[index]}</div>
        </div>
      </td>
      <td>{teachers.map((t) => {
        if (t.course_name.includes(student.course_name[index]))
          return t.fullname.split(' ').map((n) => {
            return n.charAt(0).toUpperCase() + n.substring(1,) + " "
          });
      })}
      </td>
      <td>
        {
          isGradeEdit
            ?
            <>
              {
                isSpinner
                  ?
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  :
                  <>
                    <button className='btn btn-primary p-1 mx-1' onClick={handleGradeUpdate}>
                      <span className="material-symbols-outlined align-bottom">
                        check
                      </span>
                    </button>
                    <button className='btn btn-secondary p-1 mx-1'
                      onClick={() => {
                        setIsGradeEdit(false);
                        setUpdatedGrade(student.grades[index]);
                      }}>
                      <span className="material-symbols-outlined align-bottom">
                        close
                      </span>
                    </button>
                  </>
              }
            </>
            :
            <button className='btn btn-primary p-1' onClick={() => setIsGradeEdit(true)}>
              Grade
            </button>
        }
      </td>
    </tr>
  );
}

function GradeStudents({ student }) {
  const [isGradeEdit, setIsGradeEdit] = useState(false)
  const [isSpinner, setIsSpinner] = useState(false)
  const [updatedGrade, setUpdatedGrade] = useState(student.grade.toString())

  const handleGradeUpdate = async () => {
    setIsSpinner(true);
    const updateInput = updatedGrade.trim();
    const csrfToken = getCookie('csrf_access_token');

    if (updateInput != student.grade && updateInput != '' && /\S/.test(updateInput)) {
      axios.post(API + '/update/grades/' + student.program_code + '/' + String.fromCharCode(student.program_section + 65), {
        'registration_id': student.registration_id,
        'course_id': student.course_id,
        'new_grade': updateInput
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken
        },
        withCredentials: true
      })
        .then(response => {
          if (response.status === 200)
            student.grade = updateInput;
        })
        .catch(error => {
          alert('Faild to update student grade.')
        })
        .finally(() => {
          setIsGradeEdit(false);
          setIsSpinner(false);
        });
    }
  }

  return (<>
    <td>
      <div className='row d-flex align-items-center'>
        {isGradeEdit
          ?
          <div className='col-auto mx-0'>
            <input value={updatedGrade}
              onChange={(v) => {
                if (v.target.value <= student.max_grades)
                  setUpdatedGrade(v.target.value);
              }}
              className='form-control form-control-sm' maxLength={'3'}
              style={{ width: '40px' }}></input>
          </div>
          :
          <div className='col-auto pe-1'>
            {student.grade}
          </div>
        }
        <div className='col-auto ps-1'>/ {student.max_grades}</div>
      </div>
    </td>
    <td>
      {
        isGradeEdit
          ?
          <>
            {
              isSpinner
                ?
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                :
                <>
                  <button className='btn btn-primary p-1 mx-1' onClick={handleGradeUpdate}>
                    <span className="material-symbols-outlined align-bottom">
                      check
                    </span>
                  </button>
                  <button className='btn btn-secondary p-1 mx-1'
                    onClick={() => {
                      setIsGradeEdit(false);
                      setUpdatedGrade(student.grades);
                    }}>
                    <span className="material-symbols-outlined align-bottom">
                      close
                    </span>
                  </button>
                </>
            }
          </>
          :
          <button className='btn btn-primary p-1' onClick={() => setIsGradeEdit(true)}>
            Grade
          </button>
      }
    </td>
  </>)
}

function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm_password, setConfirm_password] = useState('');
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [user_type, setUser_type] = useState(USER_TYPES[0]);
  const [sex, setSex] = useState('');

  const [isSubmited, setIsSubmited] = useState(false)

  const sexs = ["Male", "Female"];

  const isAllFieldsValid = usernameRE.test(username) && passwordRE.test(password) && password.localeCompare(confirm_password) === 0 && emailRE.test(email) && phoneRE.test(phone)

  const handleSubmit = async () => {
    axios.post(API + '/registeradmin', {
      username: username,
      password: password,
      confirm_password: confirm_password,
      fullname: fullname,
      sex: sex,
      email: email,
      phone: phone,
      user_type: user_type
    }).then(response => {
      if (response.status == 200) {
        navigate('/login');
      }
    }).catch(error => {
      alert("Something when wrong. Please try login else sign-up again.")
      // console.log('Post error: ', error.response);
    });
  }

  return (
    <div className='container'>
      <div className="text-center mt-5">
        <h1>Multani Mal Modi College MST Portal</h1>
        <p className="lead">Create your Superadmin account</p>
        <div className="alert alert-info" role="alert">
          <p><strong>Note:</strong> This is a one time process.</p>
          <p>Only use this portal to create Superadmin Account. All other users should be created from Superadmin
            Dashboard.</p>
          <p>Once Superadmin is created this page will be locked out.</p>
          <p>Please check and note all the fields before submiting.</p>
        </div>
      </div>
      <div className="row justify-content-center">
        <div className="col-md-3 p-4 shadow-lg bg-body-tertiary rounded">
          <h3>Register</h3>
          <form onSubmit={(e) => {
            setIsSubmited(true)
            e.preventDefault();
            if (isAllFieldsValid) {
              handleSubmit()
            } else {
              alert('Fill all fields correctly.');
            }
          }
          }>
            <FormInputField
              fieldType='text'
              fieldName='Username'
              fieldValue={username}
              onValueChange={setUsername}
              validate={true}
              valueCheck={(val) => usernameRE.test(val)}
              errorMsg='Minimum 8 characters. Only alphabets, numbers and _ allowed' />
            <FormInputField
              fieldType='password'
              fieldName='Password'
              fieldValue={password}
              onValueChange={setPassword}
              validate={true}
              valueCheck={(val) => passwordRE.test(val)}
              errorMsg='Password must be 8-16 characters long. It must have one lower case, upper case, digit and special character in it.' />
            <FormInputField
              fieldType='password'
              fieldName='Confirm Password'
              fieldValue={confirm_password}
              onValueChange={setConfirm_password}
              validate={true}
              valueCheck={(val) => password.localeCompare(val) === 0}
              errorMsg='Password do not match.' />
            <FormInputField
              fieldType='text'
              fieldName='Full Name'
              fieldValue={fullname}
              onValueChange={setFullname}
              validate={true}
              valueCheck={(val) => fullnameRE.test(val)}
              errorMsg="Only Alphabets, Space and ' allowed." />
            <FromDropDown
              fieldName='sex'
              fieldOptions={sexs}
              fieldValue={sex}
              onValueChange={setSex}
              validate={false} />
            <FormInputField
              fieldType='text'
              fieldName='Email'
              fieldValue={email}
              onValueChange={setEmail}
              validate={true}
              valueCheck={(val) => emailRE.test(val)}
              errorMsg='Input valid email address.' />
            <FormInputField
              fieldType='number'
              fieldName='Phone Number'
              fieldValue={phone}
              onValueChange={setPhone}
              validate={true}
              valueCheck={(val) => phoneRE.test(val)}
              errorMsg='Input 10 digit phone number.' />
            <FromDropDown
              fieldName='User Type'
              fieldOptions={USER_TYPES}
              fieldValue={user_type}
              onValueChange={setUser_type} />
            {isSubmited
              ?
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              :
              <input className='btn btn-primary' type='submit' value='Register' disabled={!isAllFieldsValid} />
            }
          </form>
        </div>
      </div>
    </div>
  );
}

function UploadCSV() {
  const navigate = useNavigate();
  const [teachersCSV, setTeachersCSV] = useState(null);
  const [studentsCSV, setStudentsCSV] = useState(null);
  const [programsCSV, setProgramsCSV] = useState(null);
  const [isSubmited, setIsSubmited] = useState(false)

  const handleOnSubmit = async (e) => {
    e.preventDefault();
    const csrfToken = getCookie('csrf_access_token');
    const formData = new FormData();
    formData.append('teacherdata', teachersCSV);
    formData.append('studentdata', studentsCSV);
    formData.append('programdata', programsCSV);

    axios.post(API + '/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-CSRF-TOKEN': csrfToken
      },
      withCredentials: true
    }
    ).then((response) => {
      if (response.status == 200) {
        alert("CSVs uploaded and database created successfully!");
      }
      else {
        alert("Failed to make database. " + response.data.msg);
      }
    }).catch((error) => {
      alert("An error occured while upload. Please try again. ");
      // console.log(error)
    }).finally(() => {
      navigate('/')
    });
  }

  return (
    <div className="container">
      <div className="text-center mt-5">
        <h1>Multani Mal Modi College MST Portal</h1>
        <p className="lead">Upload CSV</p>
      </div>
      <div className='d-flex justify-content-center'>
        <div className="d-inline-flex row justify-content-center">
          <div className="col p-4 shadow-lg bg-body-tertiary rounded">
            <h3>Upload Data</h3>
            <form onSubmit={(e) => {
              setIsSubmited(true)
              handleOnSubmit(e)
            }}>
              <FileUploadField fieldType={'file'} fieldName={'Teachers CSV'} specifier={'.csv,text/csv'} onValueChange={setTeachersCSV} />
              <FileUploadField fieldType={'file'} fieldName={'Students CSV'} specifier={'.csv,text/csv'} onValueChange={setStudentsCSV} />
              <FileUploadField fieldType={'file'} fieldName={'Programs CSV'} specifier={'.csv,text/csv'} onValueChange={setProgramsCSV} />
              {isSubmited
                ?
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                :
                <input className='btn btn-primary' type='submit' value='Upload' />
              }
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ type, title, data, dbKey, setData, isEdit, isDropDown, isNeedConfirm, regex, errorMsg, postAddress }) {
  const [editing, setEditing] = useState(false);
  const [isSpinner, setIsSpinner] = useState(false)
  const [fieldValue, setFieldValue] = useState(data);
  const [confirmFieldValue, setConfirmFieldValue] = useState('')

  function handleEdit() {
    setEditing(true);
  }

  const handleUpdate = async () => {
    const csrfToken = getCookie('csrf_access_token');
    setIsSpinner(true)
    const trimedUserInput = fieldValue.trim()
    if (data != trimedUserInput && trimedUserInput != '' && /\S/.test(trimedUserInput)) {
      setEditing(false);
      axios.post(API + postAddress, {
        'key': dbKey,
        'value': trimedUserInput
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken
        },
        withCredentials: true
      }).then(response => {
        if (response.status === 200) {
          setData(response.data.updatedValue);
        }
      }).catch((error) => {
        //console.log(error.response)
        alert('Error occured while updating ' + title + '. Please try again');
        setFieldValue(data)
        setConfirmFieldValue('')
      }).finally(() => {
        setEditing(false);
        setIsSpinner(false);
      })
    } else {
      alert("Input not valid!")
    }
  }

  function handleCancel() {
    setFieldValue(data);
    setConfirmFieldValue('');
    setEditing(false);
  }

  return (
    <div className='d-flex flex-row align-items-center border-bottom'>
      <div className='col-lg-3 col-4 fs-5 fw-semibold'>{title}: </div>
      <div className='col'>
        <div className='d-flex flex-row flex-wrap align-items-center flex-wrap'>
          {
            editing ?
              <>
                {
                  isDropDown ?
                    <FromDropDown fieldName={title}
                      fieldOptions={['Male', 'Female']}
                      fieldValue={fieldValue}
                      onValueChange={setFieldValue} />
                    :
                    <>
                      <FormInputField
                        fieldType={type}
                        fieldName={title}
                        fieldValue={fieldValue}
                        onValueChange={setFieldValue}
                        validate={true}
                        valueCheck={val => regex.test(val)}
                        errorMsg={errorMsg} />
                      {
                        isNeedConfirm &&
                        <FormInputField
                          fieldType={type}
                          fieldName={'Confirm ' + title}
                          fieldValue={confirmFieldValue}
                          onValueChange={setConfirmFieldValue}
                          validate={true}
                          valueCheck={val => fieldValue.localeCompare(val) === 0}
                          errorMsg='Both input do not match' />
                      }
                    </>
                }
              </>
              :
              <div className='p-2'>{data}</div>
          }
          {isEdit
            &&
            <div className='p-2'>
              {
                !editing ? <button className='btn btn-secondary p-1' onClick={handleEdit}>
                  <span className="material-symbols-outlined align-bottom">
                    edit
                  </span>
                </button>
                  :
                  <>
                    {
                      isSpinner ?
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        :
                        <>
                          <button className='btn btn-primary p-1' onClick={handleUpdate}>
                            <span className="material-symbols-outlined align-bottom">
                              check
                            </span>
                          </button>
                          <button className='btn btn-secondary p-1' onClick={handleCancel}>
                            <span className="material-symbols-outlined align-bottom">
                              close
                            </span>
                          </button>
                        </>
                    }
                  </>
              }
            </div>
          }
        </div>
      </div>
    </div>
  );
}

function FromDropDown({ fieldName, fieldOptions, fieldValue, onValueChange }) {
  const options = fieldOptions.map((element, index) => <option key={index}>{element}</option>);

  return (
    <div className="row my-3">
      <div className="col">
        <div className="form-floating">
          <select className='form-select' name={fieldName}
            value={fieldValue} onChange={e => onValueChange(e.target.value)}>
            {options}
          </select>
          <label htmlFor={fieldName}>{fieldName}</label>
        </div>
      </div>
    </div>
  );
}

function FormInputField({ fieldType, fieldName, fieldValue, onValueChange, validate, valueCheck, errorMsg }) {
  const [cssClass, setCssClass] = useState('form-control');
  const [errorLable, setErrorLable] = useState('')

  const handleValueChange = (val) => {
    setCssClass(valueCheck(val) ? 'form-control is-valid' : 'form-control is-invalid');
    setErrorLable(valueCheck(val) ? '' : errorMsg);
  }

  return (
    <div className="col-lg col-12 my-3">
      <div className="form-floating">
        {validate
          ?
          <>
            <input
              type={fieldType}
              className={cssClass}
              placeholder={fieldName}
              value={fieldValue}
              onChange={(e) => {
                onValueChange(e.target.value);
                handleValueChange(e.target.value);
              }}
              required></input>
            <label htmlFor={fieldName}>{fieldName}</label>
            <div className="invalid-feedback">{errorLable}</div>
          </>
          :
          <>
            <input
              type={fieldType}
              className='form-control'
              placeholder={fieldName}
              value={fieldValue}
              onChange={(e) => { onValueChange(e.target.value) }}
              required></input>
            <label htmlFor={fieldName}>{fieldName}</label>
          </>
        }
      </div>
    </div>
  );
}

function FileUploadField({ fieldName, onValueChange, specifier }) {
  const MAX_SIZE = 5 // 5mb
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type != 'text/csv') {
        alert("File must be a CSV.");
        return null;
      }
      else if (file.size > MAX_SIZE * 1024 * 1024) {
        alert("File must be under 5mb.")
        return null;
      }
      return file;
    }
  }

  return (
    <div className="row my-3">
      <div className="col">
        <div className="form-floating">
          <input
            type='file'
            className='form-control'
            placeholder={fieldName}
            onChange={(e) => onValueChange(handleFileChange(e))}
            accept={specifier}
            required></input>
          <label htmlFor={fieldName}>{fieldName}</label>
        </div>
      </div>
    </div>
  );
}



// Get property by name from cookie
// https://flask-jwt-extended.readthedocs.io/en/stable/token_locations.html
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

export default App
