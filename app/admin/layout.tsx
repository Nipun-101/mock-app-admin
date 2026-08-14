"use client";

import { Layout, Menu, Button } from "antd";
import {
  BookOutlined,
  TagOutlined,
  TagsOutlined,
  FormOutlined,
  DashboardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  QuestionCircleOutlined,
  ExperimentOutlined,
  AppstoreOutlined,
  GroupOutlined,
  UploadOutlined,
  CloseCircleOutlined,
  FileProtectOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { fetchAdminSession } from "@/lib/fetch-admin-session";

const { Sider, Content } = Layout;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const verifySession = async () => {
      const response = await fetchAdminSession();
      if (cancelled) return;
      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
      }
    };
    void verifySession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      // Keep the current page if sign-out cannot be confirmed.
    }
  };

  const menuItems = [
    {
      key: "/admin",
      icon: <DashboardOutlined />,
      label: <Link href="/admin">Dashboard</Link>,
    },
    {
      key: "/admin/questions",
      icon: <QuestionCircleOutlined />,
      label: <Link href="/admin/questions">Questions</Link>,
    },
    {
      key: "/admin/bulk-upload",
      icon: <UploadOutlined />,
      label: <Link href="/admin/bulk-upload">Bulk Upload</Link>,
    },
    {
      key: "/admin/failed-questions",
      icon: <CloseCircleOutlined />,
      label: <Link href="/admin/failed-questions">Failed Questions</Link>,
    },
    {
      key: "/admin/mock-tests",
      icon: <ExperimentOutlined />,
      label: <Link href="/admin/mock-tests">Mock Tests</Link>,
    },
    {
      key: "/admin/full-mock-tests",
      icon: <FileProtectOutlined />,
      label: <Link href="/admin/full-mock-tests">Full Mock Tests</Link>,
    },
    {
      key: "/admin/current-affairs",
      icon: <ReadOutlined />,
      label: <Link href="/admin/current-affairs">Current Affairs</Link>,
    },
    {
      key: "/admin/categories",
      icon: <AppstoreOutlined />,
      label: <Link href="/admin/categories">Categories</Link>,
    },
    {
      key: "/admin/exam-groups",
      icon: <GroupOutlined />,
      label: <Link href="/admin/exam-groups">Exam Groups</Link>,
    },
    {
      key: "/admin/exams",
      icon: <FormOutlined />,
      label: <Link href="/admin/exams">Exams</Link>,
    },
    {
      key: "/admin/subjects",
      icon: <BookOutlined />,
      label: <Link href="/admin/subjects">Subjects</Link>,
    },
    {
      key: "/admin/topics",
      icon: <TagOutlined />,
      label: <Link href="/admin/topics">Topics</Link>,
    },
    {
      key: "/admin/tags",
      icon: <TagsOutlined />,
      label: <Link href="/admin/tags">Tags</Link>,
    },
  ];

  return (
    <Layout className="min-h-screen">
      <div className="fixed top-0 left-0 right-0 z-20 bg-white border-b h-16 flex items-center px-4">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          className="text-lg"
        />
        <h1 className="text-base sm:text-xl font-bold ml-3 sm:ml-4 flex-1 truncate">
          Mock Test Admin
        </h1>
        <Button size="small" className="sm:!h-8" onClick={handleLogout}>
          Sign out
        </Button>
      </div>

      {/* Overlay for mobile */}
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setCollapsed(true)}
        />
      )}

      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={0}
        width={250}
        className={`fixed left-0 top-0 bottom-0 ${isMobile ? 'z-40' : 'z-10'} transition-all duration-300 bg-white h-screen overflow-y-auto`}
        style={{
          transform: collapsed ? 'translateX(-100%)' : 'translateX(0)',
        }}
      >
        <div className="h-16" /> {/* Spacer for header */}
        <Menu
          mode="inline"
          selectedKeys={[
            pathname.startsWith("/admin/bulk-upload")
              ? "/admin/bulk-upload"
              : pathname.startsWith("/admin/failed-questions")
                ? "/admin/failed-questions"
                : pathname.startsWith("/admin/full-mock-tests")
                  ? "/admin/full-mock-tests"
                  : pathname.startsWith("/admin/current-affairs")
                    ? "/admin/current-affairs"
                    : pathname,
          ]}
          items={menuItems}
          className="border-r-0 pt-4"
        />
      </Sider>

      <Layout>
        <Content className="mt-16 p-4 md:p-6">
          <div className="w-full">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}