function CopyButton(props) {

  function handleClick() {
    navigator.clipboard.writeText(props.valueToCopy)
      .then((response) => {
        console.log('Value copied to clipboard', props.valueToCopy)
      })
      .catch((error) => {
        console.log('Error while copying value to clipboard', error)
      })
  }

  return (
    <button
      className="copyButton"
      onClick={handleClick}
    >{props.label}</button>
  )
}

export default CopyButton
