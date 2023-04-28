// header component containing webapp main title, menu and theme settings (dark/light/auto mode) 

import Menu from './Menu'
import ThemeSetting from './ThemeSetting'

function Header(props) {
  return (
    <header>
      <h1 className="mainHeading">JASMA - just a server monitoring app</h1>
      <Menu authorized={props.authorized} />
      <ThemeSetting themeProps={props.themeProps}/>
      <div className="clearfix">
      </div>
    </header>
  )
}

export default Header
