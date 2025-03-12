import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingIndicator from '../../LoadingIndicator.jsx';
import { generateStatusMsg } from '../../../functions.jsx';
import { logout } from '../../../fetchAPI.js';

function Logout(props: any) {

  const navigate = useNavigate();

  // useState
  const [pageContent, setPageContent] = useState<null | JSX.Element>(null);

  useEffect(() => {

    // Setting relevant page content while logout functionality executes
    setPageContent(<LoadingIndicator text="Logging out" />);

      // Logout funcionality
      logout() // Logout function
        .then(response => {
          props.onLogout();
          navigate('/login');
        })
        .catch(error => {
          setPageContent(generateStatusMsg('Logout failed', 'bad'));
        })

  }, [])

  return (
    <article>
      {pageContent}
    </article>
  )
}

export default Logout;