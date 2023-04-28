// website footer component

function Footer(props) {
  return (
    <footer>
      {/* this will display "Unauthorized" if not logged in, or server time if logged in */}
      { props.authorized ? <p>Server time {props.time}</p> : <p>Unauthorized</p>}
    </footer>
  )
}

export default Footer
