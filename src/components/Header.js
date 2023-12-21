// this is header component containing main title, menu items and theme toggle button component (dark/light/auto)
import { urlBaseWithPort } from '../globals.js'
import Menu from './Menu.js'
import ThemeSetting from './ThemeSetting.js'

function Header(props) {
  return (
    <header>
      <a href={urlBaseWithPort(process.env.REACT_APP_PUBLIC_PORT_WEB, false)} className="mainHref">
        <h1 className="mainHeading">JASMA - Just Another Server Monitoring App</h1>
      </a>
      <Menu authenticated={props.authenticated} />
      <ThemeSetting themeProps={props.themeProps}/>
      <div className="clearfix">
      </div>
    </header>
  )
}

export default Header
