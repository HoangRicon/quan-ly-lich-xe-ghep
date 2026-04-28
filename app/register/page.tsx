"use client";

import { useState } from "react";
import Link from "next/link";
import { Car, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoDrawer } from "@/components/info-drawer";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      <InfoDrawer />

      <div className="relative max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 mb-4 shadow-lg shadow-blue-500/25">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Quản Lý Lịch Xe Ghép</h1>
          <p className="text-slate-400 mt-2 text-lg">Giải pháp quản lý chuyến xe thông minh cho doanh nghiệp vận tải</p>
        </div>

        {/* Contact CTA */}
        <Card className="border-0 shadow-2xl shadow-black/20 bg-white/95 backdrop-blur mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-800">Liên hệ để dùng phần mềm</CardTitle>
            <CardDescription className="text-slate-600">
              Để thêm tài khoản hoặc được tư vấn chi tiết, hãy liên hệ trực tiếp với <strong>HTool</strong> qua Zalo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary CTA */}
            <a
              href="https://zalo.me/0878836354"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 text-lg"
            >
              <svg className="w-6 h-6" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="30" fill="#0068FF" />
                <path d="M30 14c-8.8 0-16 5.8-16 12.9 0 3.4 1.5 6.5 4.2 8.9L16 46l10.6-3.7c1.3.4 2.7.6 4.1.6 8.8 0 16-5.8 16-12.9S38.8 14 30 14z" fill="#fff" />
                <path d="M25.5 25.5c.3-2.2 1.7-3.2 3-4.1.4-.3.6-.2.9 0 .4.3 1.7 1.2 1.9 1.5.3.3.4.5.1.9-.3.4-1.1 1.8-2.1 2.9-1.6 1.8-2.2 2-2.7 2-.5 0-.6-.4-1.2-.7-.6-.4-1.7-1.3-2.6-2.4-.7-.8-1.2-1.8-1.3-2-.3-.5 0-.8.2-1 .2-.2.4-.5.6-.7.2-.2.4-.4.2-.7-.2-.3-1.6-2.2-2.2-3-.5-.7-1-.6-1.3-.4z" fill="#0068FF" />
              </svg>
              Liên hệ HTool qua Zalo: 0878836354
            </a>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-sm text-slate-400">hoặc</span>
              </div>
            </div>

            {/* Contact form */}
            {sent ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-semibold text-slate-800">Đã gửi thông tin!</p>
                <p className="text-slate-500 mt-1">HTool sẽ liên hệ bạn trong thời gian sớm nhất.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Tên của bạn"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Số điện thoại"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Nội dung (số lượng tài khoản cần, yêu cầu đặc biệt...)"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm bg-slate-50 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {sending ? "Đang gửi..." : "Gửi thông tin liên hệ"}
                </button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2 text-sm text-slate-500 text-center">
            <p>Bạn đã có tài khoản? <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">Đăng nhập ngay</Link></p>
          </CardFooter>
        </Card>

        <p className="text-center text-slate-500 text-sm">© 2024 Xe Ghép. Tất cả các quyền được bảo lưu.</p>
      </div>
    </div>
  );
}
