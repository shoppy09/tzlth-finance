import { NextResponse } from 'next/server'

// Temporary debug endpoint - delete after diagnosis
export async function GET() {
  const pin = process.env.ACCESS_PIN
  return NextResponse.json({
    pin_defined: !!pin,
    pin_length: pin ? pin.length : 0,
    pin_trimmed_length: pin ? pin.trim().length : 0,
    pin_first_char: pin ? pin.charCodeAt(0) : null,
    pin_last_char: pin ? pin.charCodeAt(pin.length - 1) : null,
  })
}
