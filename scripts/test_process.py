import os
import zipfile
import csv
import json
import httpx

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP_PATH = os.path.join(BASE_DIR, 'frontend', 'public', 'samples', 'arthouse_sara.zip')
API_URL = 'http://localhost:3001/api/user/sara_celluloid25/process'

print(f"Zip file path: {ZIP_PATH}")
print(f"API endpoint: {API_URL}")

def test_api():
    if not os.path.exists(ZIP_PATH):
        print(f"Error: {ZIP_PATH} does not exist!")
        return
        
    print("Reading and parsing zip file...")
    with zipfile.ZipFile(ZIP_PATH, 'r') as zf:
        # Read profile.csv
        with zf.open('profile.csv') as pf:
            profile_text = pf.read().decode('utf-8').splitlines()
            profile_reader = csv.DictReader(profile_text)
            profile_data = list(profile_reader)[0]
            
        # Read diary.csv
        with zf.open('diary.csv') as df:
            diary_text = df.read().decode('utf-8').splitlines()
            diary_reader = csv.DictReader(diary_text)
            diary_entries = list(diary_reader)
            
    print(f"Parsed {len(diary_entries)} diary entries.")
    
    # Format entries for the backend payload
    formatted_entries = []
    for entry in diary_entries:
        rating_str = entry.get('Rating', '')
        rating = float(rating_str) * 2 if rating_str else None # letterboxd rating * 2
        
        formatted_entries.append({
            'film_name': entry['Name'],
            'film_year': entry['Year'],
            'watched_date': entry['Watched Date'],
            'rating': rating,
            'rewatch': entry['Rewatch'] == 'Yes',
            'letterboxd_uri': entry['Letterboxd URI']
        })
        
    payload = {
        'username': profile_data['Username'],
        'real_name': f"{profile_data['Given Name']} {profile_data['Family Name']}".strip(),
        'entries': formatted_entries,
        'source': 'upload'
    }
    
    print("Sending POST request to backend...")
    try:
        resp = httpx.post(API_URL, json=payload, timeout=30.0)
        print(f"Status Code: {resp.status_code}")
        
        if resp.status_code == 200:
            result = resp.json()
            print("\nSuccessfully processed sample data! Stats summary:")
            stats = result.get('wrapped', {}).get('stats', {})
            print(f"  Total Films: {stats.get('totalFilms')}")
            print(f"  Total Hours: {stats.get('totalHours')}")
            print(f"  Average Rating: {stats.get('averageRating')}")
            print(f"  Top Films Count: {len(result.get('wrapped', {}).get('topFilms', []))}")
            print(f"  Top Directors: {result.get('wrapped', {}).get('topDirectors', [])}")
            print(f"  Top Actors: {result.get('wrapped', {}).get('topActors', [])}")
            print(f"  Quirky Stats (Personality): {[q['title'] for q in result.get('wrapped', {}).get('quirkyStats', [])]}")
            print("Test passed successfully!")
        else:
            print(f"Error details: {resp.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == '__main__':
    test_api()
