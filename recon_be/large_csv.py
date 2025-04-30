import csv
import uuid
import random
from datetime import datetime, timedelta

# Configuration
NUM_ROWS = 1_000_000
DISCREPANCY_RATE = 0.05
MISSING_RATE = 0.02
EXTRA_RATE = 0.01

CURRENCIES = ['NG', 'USD', 'EUR']
STATUSES = ['SUCCESS', 'FAILED']

def generate_base_data(num_rows):
    start_date = datetime.now() - timedelta(days=365)
    data = []

    for _ in range(num_rows):
        timestamp = start_date + timedelta(days=random.randint(0, 365), seconds=random.randint(0, 86400))
        amount = round(random.uniform(1, 10000), 2)
        data.append({
            'transactionId': str(uuid.uuid4()),
            'timestamp': timestamp.isoformat(),
            'amount': amount,
            'currency': random.choice(CURRENCIES),
            'status': 'FAILED' if random.random() < 0.05 else 'SUCCESS'
        })

    return data

def introduce_discrepancies(base_data):
    system_a = []
    system_b = []

    for row in base_data:
        transactionId = row['transactionId']

        # Clone for both systems
        row_a = row.copy()
        row_b = row.copy()

        # Randomly skip some in System B (missing in B)
        if random.random() < MISSING_RATE:
            system_a.append(row_a)
            continue

        # Randomly skip some in System A (missing in A)
        if random.random() < MISSING_RATE:
            system_b.append(row_b)
            continue

        # Introduce discrepancy
        if random.random() < DISCREPANCY_RATE:
            discrepancy_type = random.choice(['amount', 'status', 'currency'])
            if discrepancy_type == 'amount':
                row_b['amount'] = round(float(row_b['amount']) + random.uniform(-50, 50), 2)
            elif discrepancy_type == 'status':
                row_b['status'] = 'FAILED' if row_b['status'] == 'SUCCESS' else 'SUCCESS'
            elif discrepancy_type == 'currency':
                row_b['currency'] = random.choice([c for c in CURRENCIES if c != row_b['currency']])

        system_a.append(row_a)
        system_b.append(row_b)

    # Add extra unknown records to System B
    extra_count = int(len(base_data) * EXTRA_RATE)
    for _ in range(extra_count):
        timestamp = datetime.now() - timedelta(days=random.randint(0, 365), seconds=random.randint(0, 86400))
        amount = round(random.uniform(1, 10000), 2)
        system_b.append({
            'transactionId': str(uuid.uuid4()),
            'timestamp': timestamp.isoformat(),
            'amount': amount,
            'currency': random.choice(CURRENCIES),
            'status': random.choice(STATUSES)
        })

    return system_a, system_b

def write_csv(filename, data):
    with open(filename, 'w', newline='') as csvfile:
        fieldnames = ['transactionId', 'timestamp', 'amount', 'currency', 'status']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)

if __name__ == "__main__":
    print("Generating base data...")
    base_data = generate_base_data(NUM_ROWS)

    print("Creating discrepancies...")
    data_a, data_b = introduce_discrepancies(base_data)

    print("Writing transactions_systemA.csv...")
    write_csv('transactions_systemA.csv', data_a)

    print("Writing transactions_systemB.csv...")
    write_csv('transactions_systemB.csv', data_b)

    print("Done! Files generated.")
