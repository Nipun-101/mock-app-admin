"use client";

import { Layout, Menu, Button } from "antd";
import {
  BookOutlined,
  TagOutlined,
  FormOutlined,
  DashboardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const { Sider, Content } = Layout;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/';
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
      key: "/admin/tags",
      icon: <TagOutlined />,
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
        <h1 className="text-xl font-bold ml-4">Mock Test Admin</h1>
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
          selectedKeys={[pathname]}
          items={menuItems}
          className="border-r-0 pt-4"
        />
      </Sider>

      <Layout>
        <Content className="mt-16 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}