# Smart Library Management System

A comprehensive, digital library API built with FastAPI and Python. This system goes beyond basic cataloging by tracking the complete lifecycle of a book, automatically calculating financial penalties for overdue returns, and utilizing a machine learning engine to recommend books based on peer borrowing habits.

## Core Features
* **Role-Based Authentication:** Secure JWT login for Students and Librarians.
* **Dynamic Book Catalog:** Advanced search capabilities allowing filtering by title, author, category, and real-time availability.
* **Stateful Lifecycle Tracking:** Seamlessly handles issuing and returning books, automatically updating inventory counts.
* **Automated Fine Calculation:** Date-aware logic that calculates overdue penalties (₹10/day) upon book return.
* **AI Collaborative Filtering:** Uses Pandas and Scikit-Learn to build a user-item matrix, recommending books based on what students with similar reading patterns have borrowed.

## Tech Stack
* **Framework:** FastAPI
* **Database:** SQLite & SQLAlchemy (ORM)
* **Authentication:** JWT (python-jose) & Bcrypt
* **Machine Learning:** Pandas, Scikit-learn

