import { useEffect, useState, createContext, useContext, } from 'react';
import { BrowserRouter, useNavigate, Routes, Route, Link, Outlet, Navigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from './navbar.jsx';
import Footer from './footer.jsx';
import './Zephyr/bootstrap.css'


const API = import.meta.env.VITE_REST_API;
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
      }).catch(() => {
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
      console.log('Unable to signout, error code: ', e.response.status);
    });
  }

  return (
      <BrowserRouter>
        <div className='container-flex'>
          <UserContext.Provider value={user}>
            <Navbar signOut={signOut} userContext={UserContext} />
            <Routes>
              <Route path='/' element={!authChecked ? <>Loading...</> : isLoggedIn ? <Index /> : <Navigate to='/login' />} />
              <Route path='/upload' element={!authChecked ? <>Loading...</> : isLoggedIn ? <UploadCSV /> : <Navigate to='/login' />} />
              <Route path='/profile/user/:user_name' element={!authChecked ? <>Loading...</> : isLoggedIn ? <ProfilePage /> : <Navigate to='/login' />} />
              <Route path='/registeradmin' element={!authChecked ? <>Loading...</> : isLoggedIn ? <Navigate to='/' /> : <RegisterPage />} />
              <Route path='/login' element={!authChecked ? <>Loading...</> : isLoggedIn ? <Navigate to='/' /> : <LoginPage />} />
            </Routes>
            <Footer />
          </UserContext.Provider>
        </div>
      </BrowserRouter>
  );
}

function Index() {
  const user = useContext(UserContext);
  const location = useLocation()
  useEffect(() => {

  }, [location.pathname]);

  return (
    <>
      <MiniProfile />
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
          <div className="tab-pane fade show active" id="programs" role="tabpanel" aria-labelledby="programs-tab">Programs</div>
          <div className="tab-pane fade" id="teacters" role="tabpanel" aria-labelledby="teacters-tab">Teachers</div>
        </div>
      </div>
    </>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const user = useContext(UserContext);

  const handleSubmit = async (e) => {
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
        console.log('Post error: ', error.response);
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
          <form onSubmit={handleSubmit}>
            <FormInputField fieldType='text' fieldName='Username'
              fieldValue={username} onValueChange={setUsername} />
            <FormInputField fieldType='password' fieldName='Password'
              fieldValue={password} onValueChange={setPassword} />
            <input className='btn btn-primary' type='submit' value='Login' />
          </form>
        </div>
      </div>
    </div>
  );
}

function MiniProfile() {
  const user = useContext(UserContext);
  return (
    <div className='container-sm pt-5'>
      <div>
        <h4>{user.fullname}'s Dashboard</h4>
      </div>
    </div>
  );
}

function ProfilePage() {
  const { user_name } = useParams();
  const { role } = useContext(UserContext).role;
  const postAddress = '/update/user/'+user_name;
  
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
          isEdit={role != 4}
          regex={fullnameRE}
          errorMsg="Only Alphabets, Space and ' allowed." 
          postAddress={postAddress} />
        <ProfileRow
          title='Sex'
          data={sex}
          setData={setSex}
          dbKey='sex'
          isEdit={role != 4}
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
          isEdit={role != 4}
          regex={emailRE}
          errorMsg='Input valid email address.'
          postAddress={postAddress} />
        <ProfileRow
          type='phone'
          title='Phone'
          data={phone}
          dbKey='phone'
          setData={setPhone}
          isEdit={role != 4}
          regex={phoneRE}
          errorMsg='Input 10 digit phone number.'
          postAddress={postAddress} />
      </div>
    </div>
  );
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
      console.log('Post error: ', error.response);
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
            <input className='btn btn-primary' type='submit' value='Register' disabled={!isAllFieldsValid} />
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
      console.log(error)
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
            <form onSubmit={handleOnSubmit}>
              <FileUploadField fieldType={'file'} fieldName={'Teachers CSV'} specifier={'.csv,text/csv'} onValueChange={setTeachersCSV} />
              <FileUploadField fieldType={'file'} fieldName={'Students CSV'} specifier={'.csv,text/csv'} onValueChange={setStudentsCSV} />
              <FileUploadField fieldType={'file'} fieldName={'Programs CSV'} specifier={'.csv,text/csv'} onValueChange={setProgramsCSV} />
              <input className='btn btn-primary' type='submit' value='Upload' />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ type, title, data, dbKey, setData, isEdit, isDropDown, isNeedConfirm, regex, errorMsg, postAddress}) {
  const [editing, setEditing] = useState(false);
  const [isSpinner, setIsSpinner] = useState(false)
  const [fieldValue, setFieldValue] = useState(data);
  const [confirmFieldValue, setConfirmFieldValue] = useState('')

  function handleEdit() {
    setEditing(true);
  }

  const handleUpdate = async()=>{
    const csrfToken = getCookie('csrf_access_token');
    setIsSpinner(true)
    if(data != fieldValue){
      setEditing(false);
      axios.post(API + postAddress, {
        'key': dbKey,
        'value': fieldValue
      }, {
        headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
        },
        withCredentials:true
      }).then(response=>{
        if(response.status === 200){
          setData(response.data.updatedValue);
        }
      }).catch((error)=>{
        console.log(error.response.data)
        alert('Error occured while updating ' + title + '. Please try again');
        setFieldValue(data)
        setConfirmFieldValue('')
      }).finally(()=>{
        setEditing(false);
        setIsSpinner(false);
      })
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
                      isSpinner ? <div className="spinner-border text-primary" role="status">
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

function Button({ title, handleClick, btnType }) {
  return (
    <button type='submit' className={'btn ' + btnType} onClick={handleClick} >{title}</button>
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
