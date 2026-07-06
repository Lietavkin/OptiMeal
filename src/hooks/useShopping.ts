import { useContext } from 'react'
import { ShoppingContext } from '../contexts/ShoppingContext'

export default function useShopping() {
  const ctx = useContext(ShoppingContext)
  if (!ctx) throw new Error('useShopping must be used within ShoppingProvider')
  return ctx
}
