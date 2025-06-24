import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { initializeApp, cert, getApps} from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

// Inisialisasi admin hanya sekali
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  })
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  const url = req.nextUrl.clone()

  if (url.pathname.startsWith('/admin')) {
    if (!token) {
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    try {
      const decodedToken = await getAuth().verifyIdToken(token)
      const email = decodedToken.email

      if (email !== 'admin@gmail.com') {
        url.pathname = '/pages/dashboard'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error("Token verification failed", error)
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'], // Middleware hanya aktif di /admin
}