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
  TeamOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { fetchAdminSession } from "@/lib/fetch-admin-session";
import { PageLoader } from "@/app/components/PageLoader";
import logo from "@/assets/logo.png";

const { Sider, Content } = Layout;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const closeSidebar = () => setCollapsed(true);
  const toggleSidebar = () => setCollapsed((open) => !open);

  useEffect(() => {
    closeSidebar();
  }, [pathname]);

  useEffect(() => {
    if (collapsed) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapsed]);

  useEffect(() => {
    let cancelled = false;
    const verifySession = async () => {
      try {
        const response = await fetchAdminSession();
        if (cancelled) return;
        if (response.status === 401 || response.status === 403) {
          router.replace("/login");
          return;
        }
        setSessionReady(true);
      } catch {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    };
    void verifySession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = async () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setSigningOut(false);
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  };

  const menuItems = [
    {
      key: "/admin",
      icon: <DashboardOutlined />,
      label: <Link href="/admin">Dashboard</Link>,
    },
    {
      key: "/admin/users",
      icon: <TeamOutlined />,
      label: <Link href="/admin/users">Users</Link>,
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
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b h-16 flex items-center px-4">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleSidebar}
          className="text-lg"
          aria-label={collapsed ? "Open navigation" : "Close navigation"}
          aria-expanded={!collapsed}
        />
        <Link
          href="/admin"
          className="ml-3 sm:ml-4 flex-1 flex items-center min-w-0"
          aria-label="Go to admin dashboard"
        >
          <Image
            src={logo}
            alt="Mock Test Admin"
            className="h-8 sm:h-10 w-auto max-w-full object-contain object-left"
            style={{ width: "auto" }}
            priority
          />
        </Link>
        <Button
          size="small"
          className="sm:!h-8"
          onClick={handleLogout}
          loading={signingOut}
        >
          Sign out
        </Button>
      </div>

      {!collapsed && (
        <div
          className="fixed inset-x-0 bottom-0 top-16 z-20 bg-black/50"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={0}
        width={250}
        className="fixed left-0 top-0 bottom-0 z-30 transition-all duration-300 bg-white h-screen overflow-y-auto"
        style={{
          transform: collapsed ? "translateX(-100%)" : "translateX(0)",
        }}
      >
        <div className="h-16" /> {/* Spacer for header */}
        <Menu
          mode="inline"
          selectedKeys={[
            pathname === "/admin"
              ? "/admin"
              : pathname.startsWith("/admin/users")
                ? "/admin/users"
                : pathname.startsWith("/admin/questions")
                ? "/admin/questions"
                : pathname.startsWith("/admin/bulk-upload")
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
            {sessionReady ? children : <PageLoader />}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}