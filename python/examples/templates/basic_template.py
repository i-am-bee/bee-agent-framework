from pydantic import BaseModel

from beeai_framework.utils.templates import PromptTemplate


class UserMessage(BaseModel):
    label: str
    input: str


template = PromptTemplate(
    schema=UserMessage,
    template="""{{label}}: {{input}}""",
)

prompt = template.render(UserMessage(label="Query", input="What interesting things happened on this day in history?"))

print(prompt)
