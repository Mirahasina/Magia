import re

text = """
Voici l'image demandée :
[GENERATE_IMAGE: "Une ville du futur"]
Et le fichier :
[GENERATE_FILE: "data.csv"]
id,name
1,Test
[/GENERATE_FILE]
"""

def process(response_text):
    image_pattern = r'\[GENERATE_IMAGE:\s*(.*?)\]'
    def replace_image(match):
        prompt = match.group(1).strip('"').strip("'")
        return f"![Image]({prompt})"
    res = re.sub(image_pattern, replace_image, response_text)
    
    file_pattern = r'\[GENERATE_FILE:\s*(.*?)\](.*?)\[/GENERATE_FILE\]'
    def replace_file(match):
        fname = match.group(1).strip('"').strip("'")
        content = match.group(2).strip()
        return f"[File {fname}]({content})"
    res = re.sub(file_pattern, replace_file, res, flags=re.DOTALL)
    return res

print(process(text))
