"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Users, Plus, Calendar, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/dashboard";

interface Account {
  id: number;
  name: string;
  slug: string;
  userCount: number;
  createdAt: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAccounts(data.accounts);
        } else {
          setError(data.error || "Không thể tải danh sách tài khoản.");
        }
      })
      .catch(() => setError("Lỗi kết nối máy chủ."))
      .finally(() => setIsLoading(false));
  }, []);

  const totalAccounts = accounts.length;
  const totalUsers = accounts.reduce((sum, a) => sum + a.userCount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <Sidebar>
      <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Danh sách tài khoản</h1>
          <p className="text-sm text-slate-500 mt-0.5">Quản lý tài khoản doanh nghiệp</p>
        </div>
        <Link
          href="/dashboard/accounts/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo tài khoản
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalAccounts}</p>
              <p className="text-xs text-slate-500">Tài khoản</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalUsers}</p>
              <p className="text-xs text-slate-500">Người dùng</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {totalAccounts > 0 ? Math.round(totalUsers / totalAccounts * 10) / 10 : 0}
              </p>
              <p className="text-xs text-slate-500">TB người/tài khoản</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Chưa có tài khoản nào.</p>
          <Link
            href="/dashboard/accounts/new"
            className="text-sm text-blue-600 hover:underline mt-2 inline-block"
          >
            Tạo tài khoản đầu tiên
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Link
              key={account.id}
              href={`/dashboard/accounts/${account.id}`}
              className="group"
            >
              <Card className="border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {account.name}
                        </CardTitle>
                        <p className="text-xs text-slate-400 font-mono">/{account.slug}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg flex-shrink-0">
                      ID {account.id}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{account.userCount} người dùng</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(account.createdAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-3 group-hover:underline">
                    Xem chi tiết & báo cáo →
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
    </Sidebar>
  );
}
