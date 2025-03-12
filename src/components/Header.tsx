// This is header component containing main title, menu items and theme toggle button component (dark/light/auto)
import { urlBase, validateEnv } from '../utils.js';
import Menu from './Menu.jsx';
import ThemeSetting from './ThemeSetting.jsx';

interface Props {
  authenticated: boolean | string;
  themeProps: {
    themeStyle: string;
    themeMode: string;
    themeToggle: () => void;
  }
}

// Environment variables
const REACT_APP_SECURE          = validateEnv(process.env.REACT_APP_SECURE, false);
const REACT_APP_PUBLIC_PORT_WEB = validateEnv(process.env.REACT_APP_PUBLIC_PORT_WEB, false);
const REACT_APP_DOMAIN          = validateEnv(process.env.REACT_APP_DOMAIN, true);
const REACT_APP_BASE_PATH       = validateEnv(process.env.REACT_APP_BASE_PATH, false);
const REACT_APP_SUBDOMAIN       = validateEnv(process.env.REACT_APP_SUBDOMAIN, false);

let urlBaseEnvs = {
  secure: REACT_APP_SECURE,
  domain: REACT_APP_DOMAIN,
  basePath: REACT_APP_BASE_PATH,
  subdomain: REACT_APP_SUBDOMAIN,
  port: REACT_APP_PUBLIC_PORT_WEB
}

function Header(props: Props) {
  return (
    <header>
      <a href={urlBase(urlBaseEnvs, false)} className="mainHref">
        <h1 className="mainHeading">JASMA - Just Another Server Monitoring App</h1>
      </a>
      <Menu authenticated={props.authenticated} />
      <ThemeSetting themeProps={props.themeProps}/>
      <div className="clearfix">
      </div>
    </header>
  )
}

export default Header;