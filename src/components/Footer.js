// this is footer component visible on all pages
function Footer(props) {

  return (
    <footer>
      {/* this will display login/logout status and server time if user is logged in */}
      { props.authenticated ? <p>Logged in as: <i>{props.authenticated}</i></p> : <p>Logged out</p>}
      { props.serverTime && <p>Server time: <i>{props.serverTime}</i></p> }
    </footer>
  )
}

export default Footer
