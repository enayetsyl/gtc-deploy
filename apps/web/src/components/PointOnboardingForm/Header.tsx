import Image from 'next/image'
import React from 'react'

const Header = () => {
  return (
    <header style={{ textAlign: "center", marginBottom: "1rem" }}>
        <Image
          src="/form-logo.png"
          alt="Form logo"
          width={800}
          height={200}
          style={{
            maxWidth: "100%",
            height: "auto",
            display: "inline-block",
          }}
        />
      </header>
  )
}

export default Header