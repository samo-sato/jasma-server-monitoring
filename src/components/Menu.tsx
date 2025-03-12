// This is component with main menu
// Menu items are conditionally generated

import { pages } from '../App.jsx'; // Data about web pages used to generate apropriate menu items
import { NavLink } from 'react-router-dom';

interface Props {
  authenticated: boolean | string;
}

function Menu(props: Props) {

  // Generate jsx menu items for menu
  function getMenu() {
    const result: JSX.Element[] = [];
    let url: string;

    pages.forEach((val, index) => {
      url = `/${val.slug}`;
      if (val.menuItem) { // Add only menu items

        // Constructing single menu item for each `menuItem=true` page
        // Note: `isActive` is variable provided by `NavLink` component
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

        if (props.authenticated && val.auth === true) { // Add menu items for logged in user
            result.push(mItem);
        } else if (!props.authenticated && val.auth === false) { // Add menu items for logged out user
          result.push(mItem);
        } else if (val.auth === null) { // Build menu items for both logged in and logged out user
          result.push(mItem);
        }

      }
    })

    return result;
  }
  const menuItems = getMenu()

  return (
    <nav>
      <ul>
        { menuItems }
      </ul>
    </nav>
  )

}

export default Menu;