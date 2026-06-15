import { redirect } from 'next/navigation'

export default function MarketplaceChatRedirect({ params }: { params: { id: string } }) {
  redirect(`/cho-sinh-vien/${params.id}/chat`)
}
