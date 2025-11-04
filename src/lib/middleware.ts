import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { initializeApp, cert, getApps} from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

// Inisialisasi admin hanya sekali
const apps = getApps()
if (!apps.length) {
  initializeApp({
    credential: cert(serviceAccount),
  })
}

const adminDb = getFirestore()

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
      const uid = decodedToken.uid

      const allowedEmails = new Set(['admin@gmail.com'])
      let allowAccess = email ? allowedEmails.has(email) : false

      if (!allowAccess) {
        try {
          const snap = await adminDb.collection('users').doc(uid).get()
          if (snap.exists) {
            const data = snap.data() as { role?: string; roles?: string[] } | undefined
            const singularRole = data?.role
            const roles = Array.isArray(data?.roles) ? data?.roles : []
            allowAccess =
              singularRole === 'admin' ||
              singularRole === 'guru' ||
              roles?.includes?.('admin') ||
              roles?.includes?.('guru')
          }
        } catch (err) {
          console.error('Failed to load user role for middleware', err)
        }
      }

      if (!allowAccess) {
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
