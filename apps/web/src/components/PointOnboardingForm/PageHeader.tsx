import Image from 'next/image'
import React from 'react'

const PageHeader = () => {
  return (
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <Image
              src="/page-header.png"
              alt="Form logo"
              width={800}
              height={300}
              style={{
                maxWidth: "100%",
                height: "auto",
                display: "inline-block",
              }}
              className='my-5'
            />
          </div>
  )
}

export default PageHeader