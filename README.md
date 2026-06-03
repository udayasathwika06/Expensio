# Expensio

Expensio is an AI-powered expense tracking and personal finance management web application that helps users manage expenses, upload receipts, categorize spending automatically, and analyze financial data through interactive dashboards.

## Features

* Secure User Authentication
* Expense Tracking Dashboard
* Receipt Upload System
* OCR-based Receipt Scanning
* Automatic Expense Categorization
* Cloud Database Integration
* Responsive Modern UI

## Tech Stack

### Frontend

* React.js
* Tailwind CSS
* Vite

### Backend

* Python
* FastAPI

### Database & Authentication

* Supabase

### AI & Processing

* OCR Service
* Expense Categorization Service

### Deployment

* Docker
* Vercel
* Nginx

## Project Architecture

```text
React Frontend
       ↓
FastAPI Backend
       ↓
OCR & Categorization Services
       ↓
Supabase Database/Auth
```

## Installation

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

### Docker Setup

```bash
docker-compose up --build
```

## Future Enhancements

* AI spending insights
* Budget prediction
* Monthly analytics reports
* Mobile app integration
* Export reports as PDF/Excel

## Author

Developed by Sathvika
