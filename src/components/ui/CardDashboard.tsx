import React from 'react'

type CardDashboard = {
    title : string,
    count : number
}

function CardDashboard({title, count}: CardDashboard) {
  
  return (
    <>
        <div className="w-full p-4 rounded-lg border shadow-md dark:bg-neutral-800">
            <h1 className="text-lg font-light">{title}</h1>
            <p className='text-3xl font-extrabold text-[#1d857c]'>{count}</p>
        </div>
    </>
  )
}

export default CardDashboard