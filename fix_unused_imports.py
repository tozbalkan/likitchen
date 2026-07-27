import json
import re
import os

with open("eslint_report.json", "r") as f:
    report = json.load(f)

for file_result in report:
    filepath = file_result["filePath"]
    messages = file_result["messages"]
    
    unused_vars = [m for m in messages if m["ruleId"] == "@typescript-eslint/no-unused-vars"]
    if not unused_vars:
        continue
        
    with open(filepath, "r") as f:
        lines = f.readlines()
        
    for m in unused_vars:
        line_idx = m["line"] - 1
        var_name = m["message"].split("'")[1]
        
        line = lines[line_idx]
        
        # Check if the unused variable is part of an import statement
        if "import " in line:
            # If it's a multi-line import or single-line import, we can try to just remove the variable name.
            # A simple regex to remove the variable from the import.
            pattern = r'\b' + re.escape(var_name) + r'\b\s*,?'
            new_line = re.sub(pattern, '', line)
            
            # Clean up trailing commas before closing brace
            new_line = re.sub(r',\s*}', ' }', new_line)
            
            # If the import is now empty `{ }` or `import type { }`, remove the line entirely
            if re.search(r'import\s+(type\s+)?\{\s*\}\s+from', new_line):
                lines[line_idx] = ""
            else:
                lines[line_idx] = new_line

    with open(filepath, "w") as f:
        f.writelines([l for l in lines if l is not None])
