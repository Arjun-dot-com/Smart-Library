import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
import models

def get_collaborative_recommendations(user_id: int, db: Session, num_recommendations: int = 5):
    # 1. Fetch all issue logs (who borrowed what)
    issue_logs = db.query(models.IssueLog.user_id, models.IssueLog.book_id).all()
    
    # If the library is brand new and has no history, return empty
    if not issue_logs:
        return []

    # 2. Convert to a Pandas DataFrame
    df = pd.DataFrame(issue_logs, columns=['user_id', 'book_id'])
    
    # Fallback: If the target user hasn't borrowed anything yet, recommend the most popular books overall
    if user_id not in df['user_id'].values:
        popular_books = df['book_id'].value_counts().head(num_recommendations).index.tolist()
        return db.query(models.Book).filter(models.Book.id.in_(popular_books)).all()

    # 3. Create the User-Item Matrix
    # Rows = users, Columns = books, Values = 1 if they borrowed it, else 0
    df['borrowed'] = 1
    user_item_matrix = df.pivot_table(index='user_id', columns='book_id', values='borrowed', fill_value=0)

    # 4. Calculate Cosine Similarity between users
    user_similarity = cosine_similarity(user_item_matrix)
    similarity_df = pd.DataFrame(user_similarity, index=user_item_matrix.index, columns=user_item_matrix.index)

    # 5. Get similar users (excluding the target user themselves)
    similar_users = similarity_df[user_id].sort_values(ascending=False).drop(user_id)

    # 6. Find books to recommend
    # Get a set of books the target user has already read so we don't recommend them again
    target_user_books = set(df[df['user_id'] == user_id]['book_id'])
    
    recommendations = {}
    
    for sim_user, score in similar_users.items():
        if score <= 0:
            continue # Skip users with zero similarity
            
        # Get books read by this similar user
        sim_user_books = set(df[df['user_id'] == sim_user]['book_id'])
        
        # Find books they read that the target user hasn't
        new_books = sim_user_books - target_user_books
        
        for book in new_books:
            if book not in recommendations:
                recommendations[book] = 0
            recommendations[book] += score # Weight the recommendation by the similarity score

    # Sort books by their weighted score (highest first) and slice the top N
    sorted_recs = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)[:num_recommendations]
    recommended_book_ids = [book_id for book_id, score in sorted_recs]

    # 7. Fallback check: If the AI found zero collaborative matches, return popular unread books
    if not recommended_book_ids:
        popular_books = df['book_id'].value_counts().index.tolist()
        fallback_ids = [b for b in popular_books if b not in target_user_books][:num_recommendations]
        return db.query(models.Book).filter(models.Book.id.in_(fallback_ids)).all()

    # 8. Fetch the full Book objects from the database to send to the frontend
    return db.query(models.Book).filter(models.Book.id.in_(recommended_book_ids)).all()