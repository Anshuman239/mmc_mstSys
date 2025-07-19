import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar({ signOut, userContext }) {
  const location = useLocation();
  const user = useContext(userContext);
  return (
    <nav className="navbar navbar-expand-md bg-primary" data-bs-theme="dark">
      <div className="container-md">
        <Link className="navbar-brand" to="/">RESULT MANAGEMENT PORTAL</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarColor01"
          aria-controls="navbarColor01" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarColor01">
          {user.isLoggedIn &&
            <ul className="navbar-nav me-auto">
              <li className="nav-item text-end">
                <Link className={(location.pathname === '/') ? 'nav-link active' : 'nav-link'} to="/">Dashboard
                </Link>
              </li>
              <li className="nav-item text-end">
                <Link className={(location.pathname === `/profile/user/${user.username}`) ? 'nav-link active' : 'nav-link'} to={`/profile/user/${user.username}`}>Profile
                </Link>
              </li>
              {/* if user is admin */
              user.role == 1 &&
              <li className="nav-item text-end">
                <Link className={(location.pathname === '/upload') ? 'nav-link active' : 'nav-link'} to="/upload">Upload CSV
                </Link>
              </li>
              }
            </ul>
          }
          <div className="navbar-nav d-flex ms-auto">
            {user.isLoggedIn ?
              <span className="nav-item text-end">
                <Link className="nav-link" onClick={signOut}>Sign Out</Link>
              </span>
              :
              <span className="nav-item text-end">
                <Link className="nav-link" to="/login">Sign In</Link>
              </span>
            }
          </div>
        </div>
      </div>
    </nav>
  );
}