# OS大赛评审管理平台 设计文档

## 概述

为 OS大赛 proj57 赛题搭建的评审管理平台。评委登录后查看参赛作品并进行评审打分，管理员管理评委账号和评审进度。

## 技术栈

- **后端**: NestJS + Prisma ORM + MySQL
- **前端**: React 18 + Vite + Ant Design 5 + React Query
- **认证**: JWT + Passport + bcrypt
- **Excel**: SheetJS
- **仓库**: pnpm workspace monorepo

## 数据模型

### users
| 字段 | 类型 | 说明 |
|---|---|---|
| id | int (PK) | 自增 |
| name | varchar | 姓名 |
| phone | varchar (unique) | 手机号 |
| password_hash | varchar | bcrypt 哈希 |
| role | enum(admin, judge) | 角色 |
| is_active | boolean | 是否启用 |
| created_at | datetime | |

### projects
| 字段 | 类型 | 说明 |
|---|---|---|
| id | int (PK) | 自增 |
| project_code | varchar (unique) | 作品编号 |
| team_name | varchar | 团队名称 |
| leader_name | varchar | 队长 |
| school | varchar | 学校 |
| repo_url | varchar | 仓库地址 |
| round | varchar | 赛段 |
| status | varchar | 评审状态 |
| remark | text | 备注 |
| created_at | datetime | |

### reviews
| 字段 | 类型 | 说明 |
|---|---|---|
| id | int (PK) | 自增 |
| judge_id | int (FK→users) | 评委 |
| project_id | int (FK→projects) | 作品 |
| doc_score | enum(优,良,中,差) | 文档评审 |
| code_score | enum(优,良,中,差) | 代码评审 |
| final_decision | enum(是,否) | 决赛意见 |
| comment | text | 评语 |
| reviewed_at | datetime | 评审时间 |

### review_history
| 字段 | 类型 | 说明 |
|---|---|---|
| id | int (PK) | 自增 |
| review_id | int (FK→reviews) | 关联评审 |
| changes | json | 变更内容 |
| operator_id | int (FK→users) | 操作人 |
| created_at | datetime | |

### import_logs
| 字段 | 类型 | 说明 |
|---|---|---|
| id | int (PK) | 自增 |
| operator_id | int (FK→users) | 操作人 |
| count | int | 导入数量 |
| filename | varchar | 文件名 |
| created_at | datetime | |

## API 设计

### 认证 POST /api/auth
- `POST /login` — 手机号+密码 → JWT
- `GET /me` — 当前用户信息

### 管理员 /api/admin
- `GET/POST /judges`, `PUT/DELETE /judges/:id` — 评委 CRUD
- `PUT /judges/:id/reset-password` — 重置密码
- `POST /projects/import` — Excel 导入
- `GET /import-logs` — 导入历史
- `GET /reviews/summary` — 评审汇总矩阵
- `GET /export` — 导出 Excel

### 评委 /api/judge
- `GET /projects` — 作品列表
- `GET /projects/:id` — 作品详情
- `GET /projects/:id/readme` — README 预览
- `POST /projects/:id/review` — 提交评审
- `GET /projects/:id/review` — 查看评审
- `GET /my-reviews` — 历史评审

## 前端路由

### 管理员
- `/admin/dashboard` — 仪表盘
- `/admin/judges` — 评委管理
- `/admin/projects` — 作品管理 + 导入
- `/admin/reviews` — 评审汇总
- `/admin/export` — 导出

### 评委
- `/judge/projects` — 作品列表
- `/judge/projects/:id` — 作品详情+评审
- `/judge/my-reviews` — 评审历史

### 公共
- `/login` — 登录

## 评审模式
每个评委独立对所有作品进行评审，互不影响。
