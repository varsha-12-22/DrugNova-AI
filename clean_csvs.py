import os

files = ['drugs_core.csv', 'targets.csv', 'pathways.csv', 'atc_codes.csv']
for f in files:
    path = os.path.join('data', f)
    with open(path, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    
    cleaned_lines = []
    for line in lines:
        line = line.strip()
        if line.startswith('"') and line.endswith('"'):
            # Remove the first and last quote
            line = line[1:-1]
            # Replace escaped "" with a single "
            line = line.replace('""', '"')
        cleaned_lines.append(line + '\n')
        
    with open(path, 'w', encoding='utf-8') as file:
        file.writelines(cleaned_lines)
    print(f"Cleaned {f}")
