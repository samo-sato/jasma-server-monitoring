// menu with controls to set theme (dark/light/auto mode)

function ThemeSetting(props) {

  function handleClick() {
    props.themeProps.themeToggle()
  }

  return (
    <div className="themeSetting">
      <div className="themeInfo">
        <div className="themeKey">Theme:</div>
        <div className="themeVal">{props.themeProps.themeMode}</div>
        <div className="clearfix"></div>
      </div>
      <button onClick={handleClick}>Change theme</button>
    </div>
  )
}

export default ThemeSetting
