"""
AI Provider Integration & Safe Configuration Service for QPMS Apex.
Supports Google Gemini and OpenAI with:
- Connection & configuration validation
- Structured JSON output parsing
- Bounded retries and timeouts
- Rate-limit handling (HTTP 429)
- Academic syllabus grounding
- Zero secret leakage in logs or responses
"""

import json
import re
import time
import httpx
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status
from app.core.config import settings

def mask_secret(secret: str) -> str:
    """Safely masks credentials: 'AIzaSy...1234' -> 'AIza...1234' or '****'"""
    if not secret:
        return ""
    if len(secret) <= 8:
        return "****"
    return f"{secret[:4]}...{secret[-4:]}"

class AIProviderService:
    def __init__(self):
        self.provider = (settings.AI_PROVIDER or "gemini").lower()
        self.gemini_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
        self.gemini_model = settings.GEMINI_MODEL or "gemini-1.5-flash"
        self.openai_key = settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY else ""
        self.openai_model = settings.OPENAI_MODEL or "gpt-4o-mini"

    def get_status(self) -> Dict[str, Any]:
        """
        Returns AI provider readiness status without exposing raw credentials.
        """
        active_provider = self.provider
        is_configured = False
        active_model = self.gemini_model if active_provider == "gemini" else self.openai_model
        masked_key = ""

        if active_provider == "gemini":
            if self.gemini_key:
                is_configured = True
                masked_key = mask_secret(self.gemini_key)
        elif active_provider == "openai":
            if self.openai_key:
                is_configured = True
                masked_key = mask_secret(self.openai_key)

        return {
            "provider": active_provider,
            "model": active_model,
            "is_configured": is_configured,
            "status": "CONFIGURED" if is_configured else "NOT_CONFIGURED",
            "masked_key": masked_key,
            "supported_models": (
                ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"]
                if active_provider == "gemini"
                else ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"]
            ),
            "configuration_guide": (
                "Set GEMINI_API_KEY in your environment or backend/.env file to activate live Google Gemini generation."
                if active_provider == "gemini"
                else "Set OPENAI_API_KEY in your environment or backend/.env file to activate live OpenAI generation."
            ),
            "features": [
                "STRUCTURED_JSON_SCHEMA",
                "SYLLABUS_GROUNDING",
                "BOUNDED_RETRIES_25S_TIMEOUT",
                "RATE_LIMIT_SAFE_HANDLING",
                "STEP_WISE_RUBRIC_SYNTHESIS"
            ]
        }

    def generate_grounded_question(
        self,
        subject_name: str,
        subject_code: str,
        unit_title: Optional[str],
        topic_title: Optional[str],
        question_type: str,
        marks: int,
        difficulty: str,
        bloom_level: str,
        unit_number: Optional[int] = None,
        allow_fallback: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Generates a syllabus-grounded academic question using the configured LLM provider.
        Enforces structured JSON output with question text, options (if MCQ),
        expected answer, marking rubric, and provenance.
        """
        status_info = self.get_status()
        if not status_info["is_configured"]:
            # If no API key is configured, return None so generator uses deterministic curriculum synthesis
            return None

        # Build rigorous academic prompt
        unit_str = f"Unit {unit_number}: {unit_title}" if (unit_number and unit_title) else (unit_title or f"Core Curriculum for {subject_name}")
        topic_str = topic_title or f"Key Principles of {unit_str}"

        system_instruction = (
            "You are a Senior University Examination Controller and Academic Subject Expert. "
            "Your task is to generate high-quality, academically rigorous university examination questions. "
            "You MUST return ONLY valid JSON matching the exact specified schema. "
            "Ensure the question strictly tests the specified syllabus unit and topic. "
            "Never invent unrelated topics. Provide clear, unambiguous text and comprehensive rubrics."
        )

        prompt = f"""
Course: {subject_name} ({subject_code})
Syllabus Unit: {unit_str}
Specific Topic: {topic_str}
Required Question Type: {question_type}
Assigned Marks: {marks} Marks
Difficulty Level: {difficulty}
Bloom's Taxonomy Level: {bloom_level}

Requirements:
1. Question text must directly evaluate '{topic_str}' within '{unit_str}'.
2. For MCQ: Exactly 4 distinct, plausible academic options with exactly one correct answer.
3. For TRUE_FALSE: Question text must formulate a definitive proposition, with options True and False.
4. For SHORT / DESCRIPTIVE / LONG: Provide an in-depth expected solution breakdown and a step-wise marking rubric summing to exactly {marks} Marks.
5. Provide a technical rationale/explanation justifying why the answer is correct according to standard academic literature.

JSON Schema to return:
{{
  "question_text": "Complete question wording...",
  "question_type": "{question_type}",
  "marks": {marks},
  "difficulty": "{difficulty}",
  "bloom_level": "{bloom_level}",
  "options": [
    {{"key": "A", "text": "...", "is_correct": true}},
    {{"key": "B", "text": "...", "is_correct": false}},
    {{"key": "C", "text": "...", "is_correct": false}},
    {{"key": "D", "text": "...", "is_correct": false}}
  ],
  "expected_answer": "Complete model answer or key points...",
  "marking_rubric": "Step-wise evaluation criteria totaling {marks} Marks...",
  "explanation": "Technical reasoning and concept explanation...",
  "syllabus_provenance": {{
    "unit_title": "{unit_str}",
    "topic_title": "{topic_str}",
    "grounding_confidence": "HIGH"
  }}
}}
"""

        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                if self.provider == "gemini":
                    res = self._call_gemini(prompt, system_instruction)
                else:
                    res = self._call_openai(prompt, system_instruction)

                if res and "question_text" in res:
                    # Enforce marks constraint
                    res["marks"] = marks
                    res["question_type"] = question_type
                    res["bloom_level"] = bloom_level
                    res["difficulty"] = difficulty
                    return res

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    print(f"[AI Provider] Rate limit encountered on attempt {attempt + 1}")
                    if attempt < max_retries:
                        time.sleep(2.0 * (attempt + 1))
                        continue
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="AI Provider API rate limit exceeded. Please wait a moment or use the Question Bank."
                        )
                else:
                    print(f"[AI Provider HTTP Error] Status {e.response.status_code}")
                    break
            except Exception as e:
                print(f"[AI Provider Call Failed] Attempt {attempt + 1}: {e}")
                if attempt < max_retries:
                    time.sleep(1.0)
                    continue

        return None

    def _call_gemini(self, prompt: str, system_instruction: str) -> Optional[Dict[str, Any]]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_key}"
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"{system_instruction}\n\n{prompt}"}]}
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.3
            }
        }
        with httpx.Client(timeout=25.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates:
                raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                return self._parse_json(raw_text)
        return None

    def _call_openai(self, prompt: str, system_instruction: str) -> Optional[Dict[str, Any]]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openai_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.openai_model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3
        }
        with httpx.Client(timeout=25.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return self._parse_json(content)

    def _parse_json(self, raw_str: str) -> Optional[Dict[str, Any]]:
        try:
            # Strip markdown code blocks if present
            cleaned = re.sub(r"^```(json)?", "", raw_str.strip())
            cleaned = re.sub(r"```$", "", cleaned.strip()).strip()
            return json.loads(cleaned)
        except Exception:
            # Fallback regex capture for JSON object
            match = re.search(r"\{.*\}", raw_str, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except Exception:
                    pass
        return None

ai_provider_service = AIProviderService()
