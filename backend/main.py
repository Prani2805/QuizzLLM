import argparse
import json
import requests
from bs4 import BeautifulSoup
from nltk.tokenize import sent_tokenize
from transformers import T5ForConditionalGeneration, T5TokenizerFast as T5Tokenizer
import pytorch_lightning as pl
from huggingface_hub import hf_hub_download
from transformers import AdamW
import PyPDF2

# Constants
MODEL_NAME = 't5-small'
LEARNING_RATE = 0.0001
SOURCE_MAX_TOKEN_LEN = 300
TARGET_MAX_TOKEN_LEN = 80
SEP_TOKEN = '<sep>'
TOKENIZER_LEN = 32101  # After adding the new <sep> token

# Question Generation Model
class QGModel(pl.LightningModule):
    def __init__(self):
        super().__init__()
        self.model = T5ForConditionalGeneration.from_pretrained(MODEL_NAME, return_dict=True)
        self.model.resize_token_embeddings(TOKENIZER_LEN)  # resizing after adding new tokens to the tokenizer

    def forward(self, input_ids, attention_mask, labels=None):
        output = self.model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
        return output.loss, output.logits

    def training_step(self, batch, batch_idx):
        input_ids = batch['input_ids']
        attention_mask = batch['attention_mask']
        labels = batch['labels']
        loss, output = self(input_ids, attention_mask, labels)
        self.log('train_loss', loss, prog_bar=True, logger=True)
        return loss

    def validation_step(self, batch, batch_idx):
        input_ids = batch['input_ids']
        attention_mask = batch['attention_mask']
        labels = batch['labels']
        loss, output = self(input_ids, attention_mask, labels)
        self.log('val_loss', loss, prog_bar=True, logger=True)
        return loss

    def test_step(self, batch, batch_idx):
        input_ids = batch['input_ids']
        attention_mask = batch['attention_mask']
        labels = batch['labels']
        loss, output = self(input_ids, attention_mask, labels)
        self.log('test_loss', loss, prog_bar=True, logger=True)
        return loss

    def configure_optimizers(self):
        return AdamW(self.parameters(), lr=LEARNING_RATE)

class QuestionGenerator():
    def __init__(self):
        self.tokenizer = T5Tokenizer.from_pretrained(MODEL_NAME)
        self.tokenizer.add_tokens(SEP_TOKEN)
        self.tokenizer_len = len(self.tokenizer)

        checkpoint_path = hf_hub_download(repo_id="rohithbandi1/fine-tuned-t5-aiquiz", filename="model.ckpt")
        self.qg_model = QGModel.load_from_checkpoint(checkpoint_path)
        self.qg_model.freeze()
        self.qg_model.eval()

    def generate(self, question_type: str, context: str) -> str:
        model_output = self._model_predict(question_type, context)
        return model_output
    
    def _model_predict(self, question_type: str, context: str) -> str:
        source_encoding = self.tokenizer(
            '{} {} {}'.format(question_type, SEP_TOKEN, context),
            max_length=SOURCE_MAX_TOKEN_LEN,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            add_special_tokens=True,
            return_tensors='pt'
        )

        generated_ids = self.qg_model.model.generate(
            input_ids=source_encoding['input_ids'],
            attention_mask=source_encoding['attention_mask'],
            num_beams=16,
            max_length=TARGET_MAX_TOKEN_LEN,
            repetition_penalty=2.5,
            length_penalty=1.0,
            early_stopping=True,
            use_cache=True
        )

        preds = {
            self.tokenizer.decode(generated_id, skip_special_tokens=True, clean_up_tokenization_spaces=True)
            for generated_id in generated_ids
        }

        return ''.join(preds)


def split_into_chunks(text, max_sentences_per_chunk=5):
    sentences = sent_tokenize(text)
    chunks = []
    for i in range(0, len(sentences), max_sentences_per_chunk):
        chunk = " ".join(sentences[i:i + max_sentences_per_chunk])
        chunks.append(chunk)
    
    return chunks


def get_geeksforgeeks_content(url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            title = soup.find('h1').get_text(strip=True)
            content_section = soup.find('div', {'class': 'entry-content'})
            if not content_section:
                content_section = soup.find('article')
            paragraphs = content_section.find_all('p')
            content = ' '.join([para.get_text(strip=True) for para in paragraphs])
            return f"Title: {title}\n\nContent:\n{content}"
        else:
            return f"Failed to retrieve content. HTTP Status Code: {response.status_code}"
    except Exception as e:
        return f"Error occurred: {e}"


def generate_questions(topic, subTopic, questionType, numQuestions):
    # Define URLs for topics
    urls = {
        # Topics for OS
        "OS": {
            "OS Basics": "https://www.geeksforgeeks.org/what-is-an-operating-system/?ref=lbp",
            "Structure of OS": "https://www.geeksforgeeks.org/operating-system-services/?ref=lbp",
            "Types of OS": "https://www.geeksforgeeks.org/batch-processing-operating-system/?ref=lbp",
            "Process Management": "https://www.geeksforgeeks.org/introduction-of-process-management/?ref=lbp",
            "CPU Scheduling": "https://www.geeksforgeeks.org/cpu-scheduling-in-operating-systems/?ref=lbp",
            "Threads": "https://www.geeksforgeeks.org/thread-in-operating-system/?ref=lbp",
            "Process Synchronization": "https://www.geeksforgeeks.org/introduction-of-process-synchronization/?ref=lbp",
            "Critical Section Problem": "https://www.geeksforgeeks.org/petersons-algorithm-in-process-synchronization/?ref=lbp",
            "Deadlocks": "https://www.geeksforgeeks.org/introduction-of-deadlock-in-operating-system/?ref=lbp",
            "Memory Management": "https://www.geeksforgeeks.org/memory-management-in-operating-system/?ref=lbp",
            "Page Replacement": "https://www.geeksforgeeks.org/page-replacement-algorithms-in-operating-systems/?ref=lbp",
            "Storage Management": "https://www.geeksforgeeks.org/storage-management/?ref=lbp"
        },
        # Topics for DBMS
        "DBMS": {
            "Basics of DBMS": "https://www.geeksforgeeks.org/introduction-of-dbms-database-management-system-set-1/?ref=lbp",
            "ER Model": "https://www.geeksforgeeks.org/introduction-of-er-model/?ref=lbp",
            "Relational Model": "https://www.geeksforgeeks.org/introduction-of-relational-model-and-codd-rules-in-dbms/?ref=lbp",
            "Relational Algebra": "https://www.geeksforgeeks.org/introduction-of-relational-algebra-in-dbms/?ref=lbp",
            "Functional Dependencies": "https://www.geeksforgeeks.org/functional-dependency-and-attribute-closure/?ref=lbp",
            "Normalisation": "https://www.geeksforgeeks.org/introduction-of-database-normalization/?ref=lbp",
            "TnC Control": "https://www.geeksforgeeks.org/concurrency-control-in-dbms/?ref=lbp",
            "Indexing, B and B+ Trees": "https://www.geeksforgeeks.org/indexing-in-databases-set-1/?ref=lbp",
            "File Organisation": "https://www.geeksforgeeks.org/file-organization-in-dbms-set-1/?ref=lbp"
        },
        "Java": {
            "data types": "https://www.geeksforgeeks.org/data-types-in-java/?ref=lbp",
            "operators": "https://www.geeksforgeeks.org/operators-in-java/?ref=lbp",
            "control statements": "https://www.geeksforgeeks.org/decision-making-javaif-else-switch-break-continue-jump/?ref=lbp",
            "loops": "https://www.geeksforgeeks.org/loops-in-java/?ref=lbp",
            "arrays": "https://www.geeksforgeeks.org/arrays-in-java/?ref=lbp",
            "strings": "https://www.geeksforgeeks.org/strings-in-java/?ref=lbp",
            "classes": "https://www.geeksforgeeks.org/classes-objects-java/?ref=lbp",
            "interfaces": "https://www.geeksforgeeks.org/interfaces-in-java/?ref=lbp",
            "packages": "https://www.geeksforgeeks.org/packages-in-java/?ref=lbp",
            "OOPS" : "https://www.geeksforgeeks.org/object-oriented-programming-oops-concept-in-java/?ref=lbp",
            "exceptions": "https://www.geeksforgeeks.org/exceptions-in-java/?ref=lbp",
            "multithreading": "https://www.geeksforgeeks.org/multithreading-in-java/?ref=lbp",
            "collections": "https://www.geeksforgeeks.org/collections-in-java/?ref=lbp",
            "file handling": "https://www.geeksforgeeks.org/file-handling-in-java/",
            "jdbc" : "https://www.geeksforgeeks.org/introduction-to-jdbc/",
        },
        "JavaScript": {
            "basics": "https://www.geeksforgeeks.org/introduction-to-javascript/?ref=lbp",
            "variables": "https://www.geeksforgeeks.org/javascript-variables/",
            "operators": "https://www.geeksforgeeks.org/javascript-operators/?ref=lbp",
            "control statements": "https://www.geeksforgeeks.org/control-statements-in-javascript/?ref=lbp",
            "functions": "https://www.geeksforgeeks.org/functions-in-javascript/?ref=lbp",
            "arrays": "https://www.geeksforgeeks.org/arrays-in-javascript/?ref=lbp",
            "objects": "https://www.geeksforgeeks.org/objects-in-javascript/?ref=lbp",
            "DOM": "https://www.geeksforgeeks.org/how-to-manipulate-dom-elements-in-javascript/",
            "events": "https://www.geeksforgeeks.org/javascript-events/?ref=lbp",
            "ES6": "https://www.geeksforgeeks.org/ecmascript-6-es6/?ref=lbp",
            "AJAX": "https://www.geeksforgeeks.org/difference-between-ajax-and-fetch-api/",
            "JSON": "https://www.geeksforgeeks.org/json-introduction/?ref=lbp",
            "NodeJS": "https://www.geeksforgeeks.org/node-js-basics/",
            "ReactJS": "https://www.geeksforgeeks.org/reactjs-basics-concepts-complete-reference/",
            "AngularJS" : "https://www.geeksforgeeks.org/angularjs/",
            "VueJS": "https://www.geeksforgeeks.org/vue-js/",
        },
    }
    # Fetch URL based on selected topic and sub-topic
    selected_url = urls.get(topic, {}).get(subTopic, None)
    if not selected_url:
        return {"questions": []}

    # Scrape the content
    context = get_geeksforgeeks_content(selected_url)
    if "Failed to retrieve content" in context or "Error occurred" in context:
        return {"questions": []}

    # Chunk the content
    chunks = split_into_chunks(context, max_sentences_per_chunk=3)

    # Initialize the question generator
    qg = QuestionGenerator()
    valid_question_types = ["fill_in_the_blanks", "mcq", "True_or_false", "short_qa"]

    if questionType not in valid_question_types:
        raise ValueError(f"Invalid question type: {questionType}. Choose from {valid_question_types}.")

    # Generate questions
    generated_questions = []
    for i, chunk in enumerate(chunks[:numQuestions]):
        raw_question = qg.generate(questionType, chunk)

        # Split the raw question using <sep>
        question_parts = raw_question.split(SEP_TOKEN)

        # Map the split parts to respective fields
        if len(question_parts) == 3:
            question_type = question_parts[0].strip()  # Question type
            question_text = question_parts[1].strip()  # Question text
            answer_text = question_parts[2].strip()  # Answer text
        else:
            question_type = questionType
            question_text = raw_question.strip()
            answer_text = ""

        generated_questions.append({
            "questionType": question_type,
            "question": question_text,
            "answer": answer_text,
            "context": chunk
        })
    return {"questions": generated_questions}


def generate_questions_from_file(file_path, question_type, num_questions):
    try:
        with open(file_path, 'rb') as pdf_file:
            reader = PyPDF2.PdfReader(pdf_file)
            content = ""
            for page in reader.pages:
                content += page.extract_text() + "\n"
    except Exception as e:
        return {"error": f"Error reading the PDF file: {str(e)}"}

    chunks = split_into_chunks(content, max_sentences_per_chunk=3)
    if not chunks:
        return {"questions": []}

    qg = QuestionGenerator()
    valid_question_types = ["fill_in_the_blanks", "mcq", "True_or_false", "short_qa"]

    if question_type not in valid_question_types:
        raise ValueError(f"Invalid question type: {question_type}. Choose from {valid_question_types}.")

    generated_questions = []
    for i, chunk in enumerate(chunks[:num_questions]):
        raw_question = qg.generate(question_type, chunk)

        # Split the raw question into parts
        question_parts = raw_question.split(SEP_TOKEN)
        if len(question_parts) == 3:
            question_type = question_parts[0].strip()
            question_text = question_parts[1].strip()
            answer_text = question_parts[2].strip()
        else:
            question_type = question_type
            question_text = raw_question.strip()
            answer_text = ""

        if question_text and answer_text:
            generated_questions.append({
                "questionType": question_type,
                "question": question_text,
                "answer": answer_text,
                "context": chunk
            })

    return {"questions": generated_questions}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate questions")
    parser.add_argument('--topic', help="Topic name")
    parser.add_argument('--subTopic', help="Sub-topic name")
    parser.add_argument('--questionType', required=True, help="Type of questions to generate")
    parser.add_argument('--numQuestions', type=int, required=True, help="Number of questions to generate")
    parser.add_argument('--file', help="Path to the uploaded file", default=None)

    args = parser.parse_args()
    try:
        if args.file:
            result = generate_questions_from_file(args.file, args.questionType, args.numQuestions)
        else:
            result = generate_questions(args.topic, args.subTopic, args.questionType, args.numQuestions)

        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error occurred: {e}")
