import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CopyButton from '../../CopyButton.js'

function New(props) {

  const navigate = useNavigate()

  useEffect(() => {

      if (!props.pw) {
        navigate('/')
      }

  }, [])

  if (props.pw) {
    const pw = props.pw
    return (
      <article>
        <h1>Demo account created</h1>
        <p>Please copy and save the following password. It will not be displayed again. Use this password for future logins. You are currently logged in.</p>
        <p>This website is a learning project and its functionality may not be fully operational. Please refrain from using it for critical tasks or serious work. Your account or the entire website may be removed at any time.</p>
        <p>If you want, you can deploy this web app on your own server using <a href="https://github.com/samo-sato/jasma-server-monitoring" target="_blank" rel="noreferrer">this repository</a>.</p>
        <div className="sameLine">
          <input value={pw} disabled={true} className="textInput marginRight" style={{width:'300px'}} />
          <CopyButton label="Copy to clipboard" valueToCopy={pw} />
        </div>
      </article>
    )
  }

}

export default New
