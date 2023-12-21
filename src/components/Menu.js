// this is component with main menu
// menu items are conditionally generated

import { pages } from '../App.js' // data about web pages used to generate apropriate menu items
import { NavLink } from 'react-router-dom'

function Menu(props) {

  // generate jsx menu items for menu
  function getMenu() {
    const result = []
    let url

    pages.forEach((val, index) => {
      url = `/${val.slug}`
      if (val.menuItem) { // add only menu items

        // constructing single menu item for each "menuItem=true" page
        // note: "isActive" is variable provided by "NavLink" component
        let mItem = (
          <li key={index}>
            <NavLink
              to={url}
              key={index}
              className={({ isActive }) => (isActive ? 'navlink navlinkSelected' : 'navlink navlinkUnselected')}
            >
              {val.name}
            </NavLink>
          </li>
        )

        if (props.authenticated && val.auth) { // building menu for logged in user
            result.push(mItem)
        } else if (!props.authenticated && !val.auth) { // building menu for logged out user
          result.push(mItem)
        }

      }
    })

    return result
  }
  const menuItems = getMenu()

  return (
    <nav>
      <ul>
        {menuItems}
      </ul>
    </nav>
  )

}

export default Menu
