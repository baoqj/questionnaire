'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
  const [questionStats] = useState([
    { question: '问题1', option1: 45, option2: 32, option3: 28, option4: 25, option5: 15, option6: 11 },
    { question: '问题2', option1: 38, option2: 42, option3: 35, option4: 22, option5: 19 },
    { question: '问题3', option1: 41, option2: 39, option3: 33, option4: 24, option5: 19 }
  ]);

  const [riskDistribution] = useState([
    { name: '低风险', value: 35, color: '#10B981' },
    { name: '中风险', value: 45, color: '#F59E0B' },
    { name: '高风险', value: 20, color: '#EF4444' }
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                数据仪表板
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 问题统计柱状图 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              各题选项统计
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={questionStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="question" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="option1" fill="#7C3AED" name="选项1" />
                  <Bar dataKey="option2" fill="#A855F7" name="选项2" />
                  <Bar dataKey="option3" fill="#C084FC" name="选项3" />
                  <Bar dataKey="option4" fill="#D8B4FE" name="选项4" />
                  <Bar dataKey="option5" fill="#E9D5FF" name="选项5" />
                  <Bar dataKey="option6" fill="#F3E8FF" name="选项6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 风险分布饼图 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              风险等级分布
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 详细统计表格 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              详细统计数据
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    问题
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    总回答数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最受欢迎选项
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    平均分数
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    您是否持有以下类型的海外金融账户？
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    156
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    个人名义的银行账户 (45人)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    2.8
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    实体分类与结构风险
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    156
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    大部分符合 (42人)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    3.2
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    税务居民身份协调
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    156
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    完全符合 (41人)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    3.5
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
