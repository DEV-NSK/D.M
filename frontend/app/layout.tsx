import './globals.css';import type {Metadata} from 'next';
export const metadata:Metadata={title:{default:'D.M — Agency operations, beautifully organized',template:'%s · D.M'},description:'The client and campaign operating system for modern digital marketing agencies.',keywords:['agency management','campaign management','client management','digital marketing software']};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
