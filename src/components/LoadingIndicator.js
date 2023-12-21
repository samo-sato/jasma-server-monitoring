// this component displays animated loading indicator

import { useEffect, useState } from 'react'

function LoadingIndicator(props) {

  const text = props.text ? props.text : 'Loading'
  const symbol = '#'
  const [count, setCount] = useState(1)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCount((prevCount) => (prevCount % 5) + 1) // Cycle through symbols
    }, 150)

    // Clear interval when component unmounts
    return () => clearInterval(intervalId)
  }, [])

  return (
    <span>
      {`${text} ${symbol.repeat(count)}`}
    </span>
  )

}

export default LoadingIndicator
