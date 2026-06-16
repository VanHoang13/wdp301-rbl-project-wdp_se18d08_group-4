import { redirect } from "next/navigation";

/** Thông báo gộp vào tab Tin nhắn — khớp mobile MessagesTabPage */
export default function ThongBaoRedirect() {
  redirect("/tin-nhan?tab=thong-bao");
}
