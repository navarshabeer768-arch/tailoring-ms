import OrderDetailPage from './_client'

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function Page() {
  return <OrderDetailPage />
}
