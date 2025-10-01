import { useCallback, useState, useEffect } from "react"
import { TaxCalculation } from "../types"
import { taxTypeService } from "@/lib/supabase"

export function useTaxCalculation() {
  const [taxRates, setTaxRates] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Load tax rates from database
  useEffect(() => {
    async function loadTaxRates() {
      try {
        const rates = await taxTypeService.getTaxRates()
        setTaxRates(rates)
      } catch (error) {
        console.error("Error loading tax rates:", error)
        // Fallback to default rates
        setTaxRates({
          gst: 12,
          cgst: 6,
          sgst: 6,
          luxurytax: 5,
          servicecharge: 10
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadTaxRates()
  }, [])

  const calculateHotelTaxes = useCallback((roomPrice: number, nights: number): TaxCalculation => {
    const subtotal = roomPrice * nights
    const gst = subtotal * (taxRates.gst || 0) / 100
    const cgst = subtotal * (taxRates.cgst || 0) / 100
    const sgst = subtotal * (taxRates.sgst || 0) / 100
    const luxuryTax = subtotal * (taxRates.luxurytax || 0) / 100
    const serviceCharge = subtotal * (taxRates.servicecharge || 0) / 100
    const totalTax = gst + cgst + sgst + luxuryTax + serviceCharge
    const grandTotal = subtotal + totalTax
    
    return {
      subtotal,
      gst,
      cgst,
      sgst,
      luxuryTax,
      serviceCharge,
      totalTax,
      grandTotal,
      nights
    }
  }, [taxRates])

  return { calculateHotelTaxes, isLoading }
}
