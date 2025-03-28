export default {
    template: `
        <div class="container mt-5">
            <h1 class="text-center">Professional Registration</h1>
            <div v-if="message" class="alert" :class="{'alert-danger': isError, 'alert-success': !isError}">{{ message }}</div>
            <form @submit.prevent="registerProfessional" enctype="multipart/form-data">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="form-control" v-model="email" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" class="form-control" v-model="password" required>
                </div>
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" class="form-control" v-model="full_name" required>
                </div>
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" class="form-control" v-model="phone_number" pattern="[0-9]{10}" placeholder="Enter 10-digit phone number" required>
                </div>
                <div class="form-group">
                    <label>Service Name</label>
                    <input type="text" class="form-control" v-model="service_name" required>
                </div>
                <div class="form-group">
                    <label>Experience (years)</label>
                    <input type="number" class="form-control" v-model="experience" required>
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <input type="text" class="form-control" v-model="address" required>
                </div>
                <div class="form-group">
                    <label>Postal Code</label>
                    <input type="text" class="form-control" v-model="postal_code" required>
                </div>
                <div class="form-group">
                    <label>Upload Documents (PDF, DOCX, JPG, PNG)</label>
                    <input type="file" class="form-control-file" multiple @change="handleFileUpload">
                </div>
                <button type="submit" class="btn btn-success btn-block">Register</button>
            </form>
        </div>
    `,
    data() {
        return { 
            email: '', password: '', full_name: '', phone_number: '', service_name: '', 
            experience: '', address: '', postal_code: '', files: [],
            message: '', isError: false 
        };
    },
    methods: {
        handleFileUpload(event) {
            this.files = event.target.files;
        },
        async registerProfessional() {
            try {
                let formData = new FormData();
                formData.append("email", this.email);
                formData.append("password", this.password);
                formData.append("full_name", this.full_name);
                formData.append("phone_number", this.phone_number);
                formData.append("service_name", this.service_name);
                formData.append("experience", this.experience);
                formData.append("address", this.address);
                formData.append("postal_code", this.postal_code);
                
                for (let i = 0; i < this.files.length; i++) {
                    formData.append("documents", this.files[i]);
                }

                const response = await axios.post('/api/register/professional', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                this.message = response.data.message;
                this.isError = false;
                setTimeout(() => this.$router.push('/login'), 2000);
            } catch (error) {
                this.message = error.response.data.message;
                this.isError = true;
            }
        }
    }
};
