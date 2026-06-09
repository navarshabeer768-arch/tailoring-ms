import CustomerDetailPage from './_client'

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function Page() {
  return <CustomerDetailPage />
}
