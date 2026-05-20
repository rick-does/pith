# Definition rules:
    **Note**: these rules are 

1. Decide whether the tool is an active tool or a passive tool. 
   - An active tool's primary purpose is to do something the user doesn't do. (jq or Claude Code)
   - A passive tool is a container or workspace where a user does the primary work. (MS Word, PiTH)
  
2. Build the definition by answering the following questions in order. Agency determines which set of questions to ask.
   - Active tool:
     1. What is it? "The <tool> is..."
     2. What does it do?
     3. How does the user relate to it?
     4. What is the final goal or purpose?
    
     For example: "jq is a Linux command that receives JSON input from STDIN and applies your rules to generate modified output."

     For active tools, break down the definitions further according to the things the tool does.

   - Passive tool:
     1. What is it? "The <tool> is..."
     2. What does the user do with it? "You <verb>..." (not "use it to")
     3. What is the final goal or purpose?

     For example: "PiTH is a visual editor for collections of Markdown files, such as static websites and AI memory files (CLAUDE.md, AGENTs.md, SKILLS.md, MEMORY.md). It consists of a hierarchy editor and a Markdown editor. In the hierarchy editor, you drag and drop files in a tree and save the hierarchy to a YAML file. In the Markdown editor, you create, edit, and preview Markdown files."

     For passive tools, break down the defnitions further according to the areas where the user works in the tool.

3. A tool is a composite of both active and passive features. Continue recursively for each division of features, applying the rules based on the feature's agency. 

4. In the context of a full set of definitions, questions for one definition may be answered in others. Allow this if it happens naturally and the answers are readily apparent. For example, the PiTH definition describes what both the hierarchy editor and Markdown editors do. No need to repeat that in the definitions for each editor. 

5. A full set of definitions is not a full doc set, but it forms the skeleton in which to add the additional content that fleshes out the ideas embedded in the definitions.

6. Answering these questions in a tight definition is useful for economy and your own understanding, but the user's version should breathe more, inviting the user to understand, not demonstrate how tightly the information can be packed. It's the difference between writing to help yourself think/learn and writing to change the way the user sees the world. Definition taxonomy is for the writer's understanding, but is too pedantic for the reader/user.

7. Avoid implementation details at the definition level. That's content. Like the YAML and Markdowns can live anywhere, but the project is always registered at ~/.pith/projects. 

# Definitions

- PiTH
  PiTH is a visual editor for collections of Markdown files, such as static websites and AI memory files. You drag and drop the files in a hierarchical tree, and PiTH saves the structure to a YAML file. It has a full Markdown editor where you can create, edit, and preview Markdown files.

    <feature list>

  - PiTH Projects
    A PiTH project is the top-level container of a collection of Markdown files and the YAML file that defines their relationships.

    <feature list>

  - Hierarchy editor
    The hierarchy editor is the main window in PiTH. It shows the Markdown files in the selected project in two lists: hierarchy list and the unlinked list.

    - Hierarchy list
      The hierarchy list shows the arrangement of Markdown files as defined in the YAML file. You can drag-drop files within the list, and you can also drag-drop to/from the Unlinked list. The root level of the hierarchy list is always the Project chip, which shows the name of the project and has a button for showing the project menu. 

    - Unlinked list

  - Markdown editor
